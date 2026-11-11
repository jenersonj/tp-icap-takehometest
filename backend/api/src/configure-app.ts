import { VersioningType, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { correlationMiddleware } from './shared/correlation.middleware.js';

/** HTTP setup shared by main.ts and the supertest specs. */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(correlationMiddleware);
  app.use(cookieParser());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Trade Blotter API')
      .setDescription(
        'BFF over RabbitMQ. Sign in with POST /api/v1/auth/login; writes need the X-CSRF-Token header echoing the blotter_csrf cookie.',
      )
      .setVersion('1')
      .addCookieAuth('blotter_at')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);
  return app;
}
