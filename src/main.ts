// import { ValidationPipe } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { NestFactory } from '@nestjs/core';
// import { NestExpressApplication } from '@nestjs/platform-express';
// import { mkdirSync } from 'fs';
// import { join } from 'path';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const uploadsRoot = join(process.cwd(), 'uploads');
//   mkdirSync(join(uploadsRoot, 'products'), { recursive: true });

//   const app = await NestFactory.create<NestExpressApplication>(AppModule);
//   app.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });
//   const configService = app.get(ConfigService);

//    const corsOrigin = configService.get<string | string[]>('cors.origin');
//    const origin =
//      typeof corsOrigin === 'string'
//        ? corsOrigin.split(',').map((o) => o.trim())
//        : (corsOrigin ?? ['http://localhost:3000']);
//   app.enableCors({
//     origin,
//     credentials: true,
//   });
//   // app.enableCors({
//   //   origin: 'http://localhost:3000',
//   //   credentials: true,
//   //   methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
//   //   allowedHeaders: ['Content-Type', 'Authorization'],
//   //   preflightContinue: false,
//   //   optionsSuccessStatus: 204,
//   // });
//   app.enableCors({
//     origin: [
//       'http://localhost:3000',
//       'https://TU-FRONTEND.vercel.app', // 👈 cámbialo por tu dominio real
//     ],
//     credentials: true,
//   });
//   // ✅ prefijo global para API
//   app.setGlobalPrefix('api');

//   // ✅ validación global
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//       transformOptions: { enableImplicitConversion: true },
//     }),
//   );

//   const port = process.env.PORT || configService.get<number>('port') || 3005;

//   await app.listen(port);

//   console.log(`🚀 Backend running on http://localhost:${port}/api`);
// }

// bootstrap();
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const uploadsRoot = join(process.cwd(), 'uploads');
  mkdirSync(join(uploadsRoot, 'products'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });

  const configService = app.get(ConfigService);

  const isDev = process.env.NODE_ENV !== 'production';

  // 👉 leer variable si existe
  const corsOrigin = configService.get<string>('CORS_ORIGIN');

  // 👉 construir lista de orígenes permitidos
  const allowedOrigins = corsOrigin
    ? corsOrigin.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // 👉 permitir requests sin origin (Postman, SSR, etc.)
      if (!origin) return callback(null, true);

      // 👉 en desarrollo permitir todo
      if (isDev) return callback(null, true);

      // 👉 en producción validar contra lista
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS bloqueado para: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT || configService.get<number>('port') || 3005;

  await app.listen(port);

  console.log(`🚀 Backend running on port ${port}`);
}

bootstrap();