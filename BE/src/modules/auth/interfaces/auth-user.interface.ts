import { HouseRole, UserRole } from '@prisma/client';

export interface AuthUser {
  sub: string;
  email: string;
  role?: UserRole | null;
  houseRoles?: Record<string, HouseRole>;
}
