import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { EvnLoginDto, EvnTokenResponseDto } from './dto/evn-login.dto';
import {
  MeterReadingResponseDto,
  DailyReading,
  GetMeterReadingDto,
} from './dto/get-meter-reading.dto';
import {
  GetMonthlyIndexDto,
  MonthlyIndexResponseDto,
} from './dto/get-monthly-index.dto';
import { SaveEvnCredentialsDto } from './dto/save-credentials.dto';
import { HouseRole } from '@prisma/client';

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class EvnService {
  private readonly logger = new Logger(EvnService.name);
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly username?: string;
  private readonly password?: string;

  // Cache token in memory (will be lost on server restart)
  private tokenCache: Map<string, CachedToken> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'EVN_API_URL',
      'https://evnhanoi.vn/api',
    );
    this.tokenUrl = this.configService.get<string>(
      'EVN_TOKEN_URL',
      'https://apicskh.evnhanoi.vn/connect/token',
    );
    this.clientId = this.configService.get<string>(
      'EVN_CLIENT_ID',
      'httplocalhost4500',
    );
    this.clientSecret = this.configService.get<string>(
      'EVN_CLIENT_SECRET',
      'secret',
    );
    this.username = this.configService.get<string>('EVN_USERNAME');
    this.password = this.configService.get<string>('EVN_PASSWORD');
  }

  /**
   * Save EVN credentials for a house
   */
  async saveCredentials(
    houseId: string,
    userId: string,
    dto: SaveEvnCredentialsDto,
  ): Promise<void> {
    // Deactivate any existing credentials
    await this.prisma.evnCredential.updateMany({
      where: { houseId },
      data: { isActive: false },
    });

    // Encrypt credentials
    const encryptedUsername = this.encryptionService.encrypt(dto.username);
    const encryptedPassword = this.encryptionService.encrypt(dto.password);

    // Save new credentials
    await this.prisma.evnCredential.create({
      data: {
        houseId,
        userId,
        username: JSON.stringify(encryptedUsername),
        password: JSON.stringify(encryptedPassword),
        isActive: true,
      },
    });

    this.logger.log(`Saved EVN credentials for house ${houseId}`);
  }

  /**
   * Get EVN credentials for a house
   */
  async getCredentials(houseId: string): Promise<{
    hasCredentials: boolean;
    maskedUsername?: string;
    customerId?: string;
    meterNumber?: string;
    updatedAt?: string;
    credentialId?: string;
  } | null> {
    const credential = await this.prisma.evnCredential.findFirst({
      where: { houseId, isActive: true },
      select: {
        id: true,
        username: true,
        customerId: true,
        meterNumber: true,
        updatedAt: true,
      },
    });

    if (!credential) {
      return null;
    }

    const decryptedUsername = this.encryptionService.decrypt(
      JSON.parse(credential.username),
    );

    return {
      hasCredentials: true,
      credentialId: credential.id,
      maskedUsername: this.maskString(decryptedUsername),
      customerId: credential.customerId ?? undefined,
      meterNumber: credential.meterNumber ?? undefined,
      updatedAt: credential.updatedAt.toISOString(),
    };
  }

  /**
   * Get house members with EVN access status
   */
  async getHouseMembersWithAccessStatus(
    houseId: string,
    credentialId?: string,
  ) {
    const memberships = await this.prisma.houseMembership.findMany({
      where: { houseId, isActive: true },
      include: {
        user: {
          select: { id: true, email: true, fullName: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // If no credentialId, return all members without access status
    if (!credentialId) {
      return memberships.map((m) => ({
        userId: m.userId,
        fullName: m.user.fullName,
        email: m.user.email,
        role: m.role,
        hasAccess: false,
      }));
    }

    // Get existing access grants
    const existingGrants = await this.prisma.evnCredentialAccess.findMany({
      where: { credentialId },
      select: { userId: true },
    });
    const userIdsWithAccess = new Set(existingGrants.map((g) => g.userId));

    return memberships.map((m) => ({
      userId: m.userId,
      fullName: m.user.fullName,
      email: m.user.email,
      role: m.role,
      hasAccess: userIdsWithAccess.has(m.userId),
    }));
  }

  /**
   * Grant EVN access to a specific user
   */
  async grantAccess(
    houseId: string,
    credentialId: string,
    userId: string,
    grantedByUserId: string,
  ) {
    // Verify user is in the house
    const membership = await this.prisma.houseMembership.findUnique({
      where: { houseId_userId: { houseId, userId } },
    });

    if (!membership) {
      throw new Error('User is not a member of this house');
    }

    return this.prisma.evnCredentialAccess.create({
      data: {
        credentialId,
        userId,
        grantedByUserId,
      },
    });
  }

  /**
   * Revoke EVN access from a specific user
   */
  async revokeAccess(houseId: string, credentialId: string, userId: string) {
    return this.prisma.evnCredentialAccess.delete({
      where: {
        credentialId_userId: {
          credentialId,
          userId,
        },
      },
    });
  }

  /**
   * Check if a user has EVN access
   */
  async userHasAccess(houseId: string, userId: string): Promise<boolean> {
    const credential = await this.prisma.evnCredential.findFirst({
      where: { houseId, isActive: true },
      include: { accessGrants: true },
    });

    if (!credential) return false;

    return credential.accessGrants.some((grant) => grant.userId === userId);
  }

  /**
   * Delete EVN credentials for a house
   */
  async deleteCredentials(houseId: string, userId: string): Promise<void> {
    await this.prisma.evnCredential.updateMany({
      where: { houseId },
      data: { isActive: false },
    });

    // Delete all access grants
    await this.prisma.evnCredentialAccess.deleteMany({
      where: { credential: { houseId } },
    });

    // Clear cached tokens for this house
    this.tokenCache.clear();

    this.logger.log(`Deleted EVN credentials for house ${houseId}`);
  }

  /**
   * Get decrypted credentials for authentication
   */
  async getHouseCredentials(houseId: string): Promise<EvnLoginDto | null> {
    const credential = await this.prisma.evnCredential.findFirst({
      where: { houseId, isActive: true },
      select: { username: true, password: true },
    });

    if (!credential) {
      return null;
    }

    return {
      username: this.encryptionService.decrypt(JSON.parse(credential.username)),
      password: this.encryptionService.decrypt(JSON.parse(credential.password)),
    };
  }

  /**
   * Toggle EVN access for all members in the house
   */
  async toggleAccessForAllMembers(
    houseId: string,
    credentialId: string,
    grantAccess: boolean,
    grantedByUserId: string,
  ) {
    const memberships = await this.prisma.houseMembership.findMany({
      where: { houseId, isActive: true },
      select: { userId: true },
    });

    if (grantAccess) {
      // Grant access to all members
      const accessGrants = memberships.map((m) => ({
        credentialId,
        userId: m.userId,
        grantedByUserId,
      }));

      // Use upsertMany pattern (delete then create)
      await this.prisma.evnCredentialAccess.deleteMany({
        where: { credentialId },
      });

      if (accessGrants.length > 0) {
        await this.prisma.evnCredentialAccess.createMany({
          data: accessGrants,
        });
      }
    } else {
      // Revoke access from all members
      await this.prisma.evnCredentialAccess.deleteMany({
        where: { credentialId },
      });
    }
  }

  /**
   * Mask a string for display (e.g., PD30000222084 -> PD*******2084)
   */
  private maskString(str: string): string {
    if (str.length <= 8) {
      return str.substring(0, 2) + '*' + str.substring(str.length - 1);
    }
    const visible = Math.floor(str.length / 3);
    return (
      str.substring(0, visible) +
      '*'.repeat(str.length - visible * 2) +
      str.substring(str.length - visible)
    );
  }

  /**
   * Get access token from EVN API
   */
  async login(credentials?: EvnLoginDto): Promise<EvnTokenResponseDto> {
    const username = credentials?.username ?? this.username;
    const password = credentials?.password ?? this.password;

    if (!username || !password) {
      throw new HttpException(
        'EVN username and password are required. Either provide credentials or configure EVN_USERNAME and EVN_PASSWORD environment variables.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const body = new URLSearchParams({
      username,
      password,
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<EvnTokenResponseDto>(
          this.tokenUrl,
          body.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      const tokenData = response.data;

      // Cache the token
      this.tokenCache.set(`${username}:${password}`, {
        token: tokenData.access_token,
        expiresAt: Date.now() + (tokenData.expires_in - 60) * 1000, // Refresh 60s before expiry
      });

      this.logger.log('Successfully obtained EVN access token');
      return tokenData;
    } catch (error: any) {
      this.logger.error('Failed to get EVN access token', error);
      throw new HttpException(
        `Failed to authenticate with EVN: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Get cached token or refresh if expired
   */
  async getValidToken(credentials?: EvnLoginDto): Promise<string> {
    const username = credentials?.username ?? this.username;
    const password = credentials?.password ?? this.password;
    const cacheKey = `${username}:${password}`;

    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    // Token expired or not found, get new one
    const tokenData = await this.login(credentials);
    return tokenData.access_token;
  }

  /**
   * Get meter readings for a customer
   */
  async getMeterReadings(
    data: GetMeterReadingDto,
    token: string,
  ): Promise<MeterReadingResponseDto> {
    this.logger.log(`Getting meter readings for maDiemDo: ${data.maDiemDo}`);
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/TraCuu/LayChiSoDoXaPharse2`,
          {
            maDonVi: data.maDonVi,
            maDiemDo: data.maDiemDo,
            ngayDau: data.ngayDau,
            ngayCuoi: data.ngayCuoi,
            maXacThuc: data.maXacThuc ?? 'EVNHN',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      this.logger.log(`EVN API response: ${JSON.stringify(response.data)}`);
      return this.parseMeterReadingResponse(response.data, data);
    } catch (error: any) {
      this.logger.error('Failed to get meter readings', error);
      const errorMessage = error?.response?.data || error.message;
      this.logger.error(
        `EVN API error details: ${JSON.stringify(errorMessage)}`,
      );
      throw new HttpException(
        `Failed to get meter readings: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Get meter readings with automatic authentication
   */
  async getMeterReadingsWithAuth(
    data: GetMeterReadingDto,
    credentials?: EvnLoginDto,
  ): Promise<MeterReadingResponseDto> {
    const token = await this.getValidToken(credentials);
    return this.getMeterReadings(data, token);
  }

  /**
   * Get meter readings for a house (uses house credentials)
   */
  async getMeterReadingsForHouse(
    houseId: string,
    data: GetMeterReadingDto,
  ): Promise<MeterReadingResponseDto> {
    // Try to get house credentials first
    const houseCredentials = await this.getHouseCredentials(houseId);

    if (houseCredentials) {
      this.logger.log(`Using saved EVN credentials for house ${houseId}`);
      return this.getMeterReadingsWithAuth(data, houseCredentials);
    }

    // Fallback to environment credentials
    this.logger.log(`Using environment EVN credentials for house ${houseId}`);
    return this.getMeterReadingsWithAuth(data);
  }

  /**
   * Parse EVN API response to standard format
   */
  private parseMeterReadingResponse(
    apiData: any,
    request: GetMeterReadingDto,
  ): MeterReadingResponseDto {
    const result: MeterReadingResponseDto = {
      customerId: request.customerId,
      maDiemDo: request.maDiemDo,
      readings: [],
      latestIndex: 0,
      previousIndex: 0,
      usage: 0,
      tongSanLuong: {},
    };

    // Parse tongSanLuong if available
    if (apiData?.data?.tongSanLuong) {
      result.tongSanLuong = {
        bt: apiData.data.tongSanLuong.bt || 0,
        cd: apiData.data.tongSanLuong.cd || 0,
        td: apiData.data.tongSanLuong.td || 0,
        vc: apiData.data.tongSanLuong.vc || 0,
        kt: apiData.data.tongSanLuong.kt || 0,
      };
    }

    // Parse daily readings from chiSoNgayFull or chiSoNgay
    const readingsData =
      apiData?.data?.chiSoNgayFull || apiData?.data?.chiSoNgay || [];

    if (Array.isArray(readingsData) && readingsData.length > 0) {
      result.readings = readingsData.map((item: any) => ({
        date: item.ngay || item.ngayShort,
        value: item.chiSo || item.sg || 0,
        usage: item.sanLuong || 0,
        soCto: item.soCto,
        maDiemDo: item.maDiemDo,
        hsNhan: item.hsNhan,
        loaiBcs: item.loaiBcs,
      })) as DailyReading[];

      // Get soCto from first reading
      if (readingsData[0]?.soCto) {
        result.soCto = readingsData[0].soCto;
      }

      // Sort by date ascending to calculate properly
      const sorted = [...result.readings].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      // Latest index is the last reading (most recent)
      result.latestIndex = sorted[sorted.length - 1]?.value || 0;
      // Previous index is the first reading (oldest)
      result.previousIndex = sorted[0]?.value || 0;
      // Total usage for the entire period
      result.usage = result.latestIndex - result.previousIndex;
    }

    return result;
  }

  /**
   * Get menu/customer list (if needed to get customer IDs)
   */
  async getCustomerList(token: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/GetMenu`, {
          params: {
            maximumLevel: 2,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get customer list', error);
      throw new HttpException(
        `Failed to get customer list: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Get monthly index for a customer
   */
  async getMonthlyIndex(
    data: GetMonthlyIndexDto,
    token: string,
  ): Promise<MonthlyIndexResponseDto> {
    this.logger.log(
      `Getting monthly index for maDiemDo: ${data.maDiemDo}, thang: ${data.thang}, nam: ${data.nam}`,
    );
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/TraCuu/GetChiSoDiemDo`,
          {
            maDViQLy: data.maDViQLy,
            maKhachHang: data.maKhachHang,
            maDiemDo: data.maDiemDo,
            nam: data.nam,
            thang: data.thang,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      this.logger.log(`EVN API response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get monthly index', error);
      const errorMessage = error?.response?.data || error.message;
      this.logger.error(
        `EVN API error details: ${JSON.stringify(errorMessage)}`,
      );
      throw new HttpException(
        `Failed to get monthly index: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Get monthly index with automatic authentication
   */
  async getMonthlyIndexWithAuth(
    data: GetMonthlyIndexDto,
    credentials?: EvnLoginDto,
  ): Promise<MonthlyIndexResponseDto> {
    const token = await this.getValidToken(credentials);
    return this.getMonthlyIndex(data, token);
  }

  /**
   * Get monthly index for a house (uses house credentials)
   */
  async getMonthlyIndexForHouse(
    houseId: string,
    data: GetMonthlyIndexDto,
  ): Promise<MonthlyIndexResponseDto> {
    const houseCredentials = await this.getHouseCredentials(houseId);

    if (houseCredentials) {
      this.logger.log(
        `Using saved EVN credentials for house ${houseId} (monthly index)`,
      );
      return this.getMonthlyIndexWithAuth(data, houseCredentials);
    }

    this.logger.log(
      `Using environment EVN credentials for house ${houseId} (monthly index)`,
    );
    return this.getMonthlyIndexWithAuth(data);
  }
}
