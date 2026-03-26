import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateHouseDto } from './dto/create-house.dto';
import { HousesService } from './houses.service';

@Controller('houses')
@UseGuards(JwtAuthGuard)
export class HousesController {
  constructor(
    private readonly housesService: HousesService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateHouseDto) {
    const house = await this.housesService.create(user.sub, dto);
    const session = await this.authService.createSessionForUser(user.sub);

    return { house, session };
  }

  @Get(':houseId')
  findOne(@Param('houseId') houseId: string) {
    return this.housesService.findOne(houseId);
  }
}
