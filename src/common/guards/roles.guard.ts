import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtUserPayload } from '../interfaces/jwt-user-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtUserPayload }>();
    const user = request.user;
    if (!user) {
      return false;
    }
    /** Jerarquía: SUPER_ADMIN cumple cualquier @Roles(...) requerido. */
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }
    /** ADMIN u otros: deben coincidir con uno de los roles declarados. */
    return requiredRoles.includes(user.role);
  }
}
