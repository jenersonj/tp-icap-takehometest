import { MessagingModule } from '@blotter/messaging';
import { Module, type DynamicModule } from '@nestjs/common';

import { API_CONFIG, type ApiConfig } from './config/api.config';
import { HealthController } from './health/health.controller';

/** The BFF: HTTP in, RabbitMQ RPC out. No business logic, no DB, no realtime. */
@Module({})
export class AppModule {
  static register(config: ApiConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        MessagingModule.forRoot({
          urls: [config.RABBITMQ_URL],
          exchange: config.RABBITMQ_EXCHANGE,
          defaultTimeoutMs: config.RPC_TIMEOUT_MS,
        }),
      ],
      controllers: [HealthController],
      providers: [{ provide: API_CONFIG, useValue: config }],
    };
  }
}
