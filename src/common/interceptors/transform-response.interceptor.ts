import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RAW_RESPONSE_KEY, RESPONSE_MESSAGE_KEY } from '../constants/metadata-keys';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<unknown> | unknown> {
    const isRawResponse = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isRawResponse) {
      return next.handle();
    }

    const defaultMessage = 'Operación exitosa';
    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? defaultMessage;

    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'data' in data
        ) {
          return data as ApiSuccessResponse<unknown>;
        }
        return {
          success: true as const,
          message,
          data,
        };
      }),
    );
  }
}
