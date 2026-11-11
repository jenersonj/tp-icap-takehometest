import { MessagingModule, type MessageBus } from '@blotter/messaging';
import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

import { AuthController } from './auth/auth.controller.js';
import { API_CONFIG, type ApiConfig } from './config/api.config.js';
import { HealthController } from './health/health.controller.js';
import { PositionsController } from './positions/positions.controller.js';
import { PricesController } from './prices/prices.controller.js';
import { RealtimeController } from './realtime/realtime.controller.js';
import { ApiExceptionFilter } from './shared/api-exception.filter.js';
import { SessionGuard } from './shared/auth/session.guard.js';
import { RpcClient } from './shared/rpc-client.js';
import { TradesController } from './trades/trades.controller.js';

/** The BFF: HTTP in, RabbitMQ RPC out. No business logic, no DB, no realtime. */
@Module({})
export class AppModule {
  /** `bus` replaces RabbitMQ (tests pass an InMemoryMessageBus). */
  static register(config: ApiConfig, bus?: MessageBus): DynamicModule {
    return {
      module: AppModule,
      imports: [
        MessagingModule.forRoot(
          bus
            ? { bus }
            : {
                urls: [config.RABBITMQ_URL],
                exchange: config.RABBITMQ_EXCHANGE,
                defaultTimeoutMs: config.RPC_TIMEOUT_MS,
              },
        ),
      ],
      controllers: [
        HealthController,
        AuthController,
        TradesController,
        PositionsController,
        PricesController,
        RealtimeController,
      ],
      providers: [
        { provide: API_CONFIG, useValue: config },
        RpcClient,
        { provide: APP_GUARD, useClass: SessionGuard },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    };
  }
}
