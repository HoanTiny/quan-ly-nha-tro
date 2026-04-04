import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EvnLoginDto, EvnTokenResponseDto } from './dto/evn-login.dto';
import { MeterReadingResponseDto, DailyReading, GetMeterReadingDto } from './dto/get-meter-reading.dto';
import { GetMonthlyIndexDto, MonthlyIndexResponseDto } from './dto/get-monthly-index.dto';

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
  ) {
    this.baseUrl = this.configService.get<string>('EVN_API_URL', 'https://evnhanoi.vn/api');
    this.tokenUrl = this.configService.get<string>('EVN_TOKEN_URL', 'https://apicskh.evnhanoi.vn/connect/token');
    this.clientId = this.configService.get<string>('EVN_CLIENT_ID', 'httplocalhost4500');
    this.clientSecret = this.configService.get<string>('EVN_CLIENT_SECRET', 'secret');
    this.username = this.configService.get<string>('EVN_USERNAME');
    this.password = this.configService.get<string>('EVN_PASSWORD');
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
        this.httpService.post<EvnTokenResponseDto>(this.tokenUrl, body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
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
  async getMeterReadings(data: GetMeterReadingDto, token: string): Promise<MeterReadingResponseDto> {
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
      this.logger.error(`EVN API error details: ${JSON.stringify(errorMessage)}`);
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
   * Parse EVN API response to standard format
   */
  private parseMeterReadingResponse(apiData: any, request: GetMeterReadingDto): MeterReadingResponseDto {
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
    const readingsData = apiData?.data?.chiSoNgayFull || apiData?.data?.chiSoNgay || [];

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
  async getMonthlyIndex(data: GetMonthlyIndexDto, token: string): Promise<MonthlyIndexResponseDto> {
    this.logger.log(`Getting monthly index for maDiemDo: ${data.maDiemDo}, thang: ${data.thang}, nam: ${data.nam}`);
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
      this.logger.error(`EVN API error details: ${JSON.stringify(errorMessage)}`);
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
}
