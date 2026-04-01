import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';
    let errors: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as { message?: string | string[]; error?: string };
        message = body.message ?? body.error ?? message;
        if (Array.isArray(body.message)) {
          errors = body.message;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      message = mapPrismaError(exception);
    } else if (exception instanceof Error) {
      this.logger.error(exception.stack);
      message = exception.message;
    } else {
      this.logger.error(exception);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? 'Error de validación' : message,
      ...(Array.isArray(message) && { errors: message }),
      ...(errors !== undefined && { errors }),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): string {
  switch (err.code) {
    case 'P2002':
      return 'Ya existe un registro con ese valor único.';
    case 'P2025':
      return 'Registro no encontrado.';
    case 'P2003':
      return 'Referencia inválida (clave foránea).';
    default:
      return 'Error de base de datos.';
  }
}
