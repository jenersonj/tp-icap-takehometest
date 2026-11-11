import 'reflect-metadata';

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module.js';
import { loadApiConfig } from './config/api.config.js';

// Local dev convenience: pick up the repo-root .env when present (Docker passes real env vars).
const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

async function bootstrap(): Promise<void> {
  const config = loadApiConfig();
  const app = await NestFactory.create(AppModule.register(config), { bufferLogs: true });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(cookieParser());
  app.enableShutdownHooks();
  await app.listen(config.PORT, '0.0.0.0');
  new Logger('Api').log(`Listening on :${config.PORT} (/api/v1)`);
}

void bootstrap().catch((error: unknown) => {
  new Logger('Api').error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
