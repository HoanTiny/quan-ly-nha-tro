import { HouseRole } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AssignRoomDto } from './dto/assign-room.dto';
import { CreateMemberDto } from './dto/create-member.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  list(houseId: string) {
    return this.prisma.houseMembership.findMany({
      where: { houseId },
      include: {
        user: true,
        room: true,
      },
      orderBy: [{ isActive: 'desc' }, { joinedAt: 'desc' }],
    });
  }

  async create(dto: CreateMemberDto) {
    const passwordHash = await bcrypt.hash(dto.password ?? '123456', 10);
    const user =
      (await this.prisma.user.findUnique({ where: { email: dto.email } })) ??
      (await this.prisma.user.create({
        data: {
          email: dto.email,
          fullName: dto.fullName,
          phone: dto.phone,
          passwordHash,
        },
      }));

    return this.prisma.houseMembership.upsert({
      where: {
        houseId_userId: {
          houseId: dto.houseId,
          userId: user.id,
        },
      },
      update: {
        roomId: dto.roomId,
        role: dto.role ?? HouseRole.TENANT,
        isActive: true,
        leftAt: null,
      },
      create: {
        houseId: dto.houseId,
        userId: user.id,
        roomId: dto.roomId,
        role: dto.role ?? HouseRole.TENANT,
      },
      include: {
        user: true,
        room: true,
      },
    });
  }

  async assignRoom(membershipId: string, dto: AssignRoomDto) {
    const membership = await this.prisma.houseMembership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return this.prisma.houseMembership.update({
      where: { id: membershipId },
      data: {
        roomId: dto.roomId ?? null,
      },
      include: {
        user: true,
        room: true,
      },
    });
  }

  async remove(membershipId: string) {
    const membership = await this.prisma.houseMembership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return this.prisma.houseMembership.update({
      where: { id: membershipId },
      data: {
        isActive: false,
        leftAt: new Date(),
        roomId: null,
      },
    });
  }
}
