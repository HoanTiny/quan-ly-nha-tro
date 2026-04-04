import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HouseRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new UnauthorizedException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
      },
    });

    return this.createSessionForUser(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const isValid = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = await this.prisma.houseMembership.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return this.createSessionForUser(user.id);
  }

  async me(userId: string) {
    const session = await this.getSessionContext(userId);

    return {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role,
      houseId: session.user.houseId,
      houseRoles: session.user.houseRoles,
    };
  }

  async createSessionForUser(userId: string) {
    const session = await this.getSessionContext(userId);
    return this.issueToken(
      session.user.id,
      session.user.email,
      session.user.fullName,
      session.user.role,
      session.user.houseId,
      session.user.houseRoles,
    );
  }

  private async getSessionContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.prisma.houseMembership.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: {
        houseId: true,
        role: true,
      },
    });

    // Convert to houseRoles map: { [houseId: string]: HouseRole }
    const houseRoles: Record<string, HouseRole> = {};
    let primaryHouseId: string | null = null;

    memberships.forEach(m => {
      houseRoles[m.houseId] = m.role;
      if (!primaryHouseId) {
        primaryHouseId = m.houseId;
      }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: memberships[0]?.role ?? HouseRole.TENANT,
        houseId: primaryHouseId,
        houseRoles,
      },
    };
  }

  private issueToken(
    userId: string,
    email: string,
    fullName: string,
    role: HouseRole,
    houseId: string | null,
    houseRoles: Record<string, HouseRole>,
  ) {
    return {
      accessToken: this.jwtService.sign({ sub: userId, email, role, houseRoles }),
      user: { id: userId, email, fullName, role, houseId, houseRoles },
    };
  }
}
