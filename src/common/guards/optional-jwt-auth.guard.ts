import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string } }>();
    const auth = request.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return true;
    }
    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      return true;
    }
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    info: unknown,
  ): TUser | undefined {
    if (err || !user) {
      return undefined;
    }
    return user;
  }
}
