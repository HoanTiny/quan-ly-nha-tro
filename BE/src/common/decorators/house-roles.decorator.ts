import { SetMetadata } from '@nestjs/common';
import { HouseRole } from '@prisma/client';

export const HOUSE_ROLES_KEY = 'house_roles';
export const HouseRoles = (...roles: HouseRole[]) => SetMetadata(HOUSE_ROLES_KEY, roles);
