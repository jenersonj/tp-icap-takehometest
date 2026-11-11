import 'reflect-metadata';

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Queues } from '@blotter/contracts';
import { RmqMessageBus, nestDispatchLogger } from '@blotter/messaging';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { loadServiceConfig } from './config/service.config.js';

// Local dev convenience: pick up the repo-root .env when present (Docker passes real env vars).
const rootEnv = resolve(process.cwd(), '../../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

async function bootstrap(): Promise<void> {
  const config = loadServiceConfig();
  const logger = new Logger('TradeService');
  const bus = new RmqMessageBus({
    urls: [config.RABBITMQ_URL],
    exchange: config.RABBITMQ_EXCHANGE,
    consumerQueue: Queues.TRADE_SERVICE_RPC,
    logger: nestDispatchLogger(logger),
  });

  const app = await NestFactory.createMicroservice(AppModule.register(config, bus), {
    strategy: bus.consumer,
    bufferLogs: true,
  });
  app.enableShutdownHooks();
  await app.listen();
  await bus.connect();
  logger.log(`Consuming ${Queues.TRADE_SERVICE_RPC} on exchange "${config.RABBITMQ_EXCHANGE}"`);
}

void bootstrap().catch((error: unknown) => {
  new Logger('TradeService').error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
