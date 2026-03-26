import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: {
        houseId: dto.houseId,
        code: dto.code,
        name: dto.name ?? dto.code,
        capacity: dto.capacity,
        floor: dto.floor,
      },
    });
  }

  listByHouse(houseId: string) {
    return this.prisma.room.findMany({
      where: { houseId },
      include: { memberships: true },
      orderBy: { code: 'asc' },
    });
  }
}
