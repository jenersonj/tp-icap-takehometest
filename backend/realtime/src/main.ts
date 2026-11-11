import 'reflect-metadata';

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Queues } from '@blotter/contracts';
import { RmqMessageBus, nestDispatchLogger } from '@blotter/messaging';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { loadRealtimeConfig } from './config/realtime.config.js';

// Local dev convenience: pick up the repo-root .env when present (Docker passes real env vars).
const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

async function bootstrap(): Promise<void> {
  const config = loadRealtimeConfig();
  const logger = new Logger('Realtime');
  const bus = new RmqMessageBus({
    urls: [config.RABBITMQ_URL],
    exchange: config.RABBITMQ_EXCHANGE,
    consumerQueue: Queues.REALTIME_COMMANDS,
    logger: nestDispatchLogger(logger),
  });

  // One process: HTTP (health + Socket.IO upgrade) and a RabbitMQ consumer for emit commands.
  const app = await NestFactory.create(AppModule.register(config, bus), { bufferLogs: true });
  app.enableCors({ origin: config.CORS_ORIGINS, credentials: true });
  app.connectMicroservice({ strategy: bus.consumer }, { inheritAppConfig: true });
  app.enableShutdownHooks();
  await app.startAllMicroservices();
  await bus.connect();
  await app.listen(config.PORT, '0.0.0.0');
  logger.log(`Listening on :${config.PORT}, consuming ${Queues.REALTIME_COMMANDS}`);
}

void bootstrap().catch((error: unknown) => {
  new Logger('Realtime').error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
