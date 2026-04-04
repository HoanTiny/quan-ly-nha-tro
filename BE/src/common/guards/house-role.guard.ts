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

    if (!user) {
      throw new ForbiddenException('Missing authenticated user');
    }

    // If houseId is in params, use it (traditional route-based house context)
    // Otherwise, check if user has any house role (for endpoints like EVN that use user's houseRoles)
    if (houseId) {
      const houseRole = user.houseRoles?.[houseId];
      if (!houseRole || !roles.includes(houseRole)) {
        throw new ForbiddenException('Insufficient role for this boarding house');
      }
    } else {
      // No houseId in params - check if user has at least one house with required role
      const userHouseIds = Object.keys(user.houseRoles ?? {});
      if (userHouseIds.length === 0) {
        throw new ForbiddenException('User is not a member of any house');
      }

      // Check if user has any of the required roles in any house
      const hasRequiredRole = userHouseIds.some(id => {
        const userRole = user.houseRoles?.[id];
        return userRole && roles.includes(userRole);
      });

      if (!hasRequiredRole) {
        throw new ForbiddenException('Insufficient role for this operation');
      }
    }

    return true;
  }
}
