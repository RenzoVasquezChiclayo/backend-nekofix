import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUserPayload } from '../interfaces/jwt-user-payload.interface';

export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtUserPayload | undefined,
    ctx: ExecutionContext,
  ): JwtUserPayload | unknown => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtUserPayload }>();
    const user = request.user;
    if (data && user) {
      return user[data];
    }
    return user;
  },
);
