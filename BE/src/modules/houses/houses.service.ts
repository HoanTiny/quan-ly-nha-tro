import { HouseRole } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateHouseDto } from './dto/create-house.dto';

@Injectable()
export class HousesService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerUserId: string, dto: CreateHouseDto) {
    return this.prisma.$transaction(async (tx) => {
      const house = await tx.boardingHouse.create({
        data: {
          code: dto.code,
          name: dto.name,
          address: dto.address,
        },
      });

      await tx.houseMembership.upsert({
        where: {
          houseId_userId: {
            houseId: house.id,
            userId: ownerUserId,
          },
        },
        update: {
          role: HouseRole.OWNER,
          isActive: true,
          leftAt: null,
        },
        create: {
          houseId: house.id,
          userId: ownerUserId,
          role: HouseRole.OWNER,
        },
      });

      return house;
    });
  }

  findOne(houseId: string) {
    return this.prisma.boardingHouse.findUnique({
      where: { id: houseId },
      include: { rooms: true, memberships: true },
    });
  }
}
