import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HouseRole } from '@prisma/client';
import { AuthUser } from 'src/modules/auth/interfaces/auth-user.interface';
import { HOUSE_ROLES_KEY } from '../decorators/house-roles.decorator';

@Injectable()
export class HouseRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<HouseRole[]>(HOUSE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    const houseId = request.params.houseId as string | undefined;

    if (!user || !houseId) {
      throw new ForbiddenException('Missing authenticated user or house context');
    }

    const houseRole = user.houseRoles?.[houseId];

    if (!houseRole || !roles.includes(houseRole)) {
      throw new ForbiddenException('Insufficient role for this boarding house');
    }

    return true;
  }
}
