import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AssignRoomDto } from './dto/assign-room.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { MembersService } from './members.service';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'MANAGER')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(@Query('houseId') houseId: string) {
    return this.membersService.list(houseId);
  }

  @Post()
  create(@Body() dto: CreateMemberDto) {
    return this.membersService.create(dto);
  }

  @Patch(':membershipId/room')
  assignRoom(@Param('membershipId') membershipId: string, @Body() dto: AssignRoomDto) {
    return this.membersService.assignRoom(membershipId, dto);
  }

  @Delete(':membershipId')
  remove(@Param('membershipId') membershipId: string) {
    return this.membersService.remove(membershipId);
  }
}
