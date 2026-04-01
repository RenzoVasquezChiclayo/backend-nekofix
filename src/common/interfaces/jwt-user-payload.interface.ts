import { UserRole } from '@prisma/client';

export interface JwtUserPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
