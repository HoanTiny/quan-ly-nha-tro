import { HouseRole, UserRole } from '@prisma/client';

export interface AuthUser {
  sub: string;
  email: string;
  role?: UserRole | HouseRole | null;
  houseRoles?: Record<string, HouseRole>;
}
