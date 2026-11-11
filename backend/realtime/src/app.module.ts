import { MessagingModule, type MessageBus } from '@blotter/messaging';
import { Module, type DynamicModule } from '@nestjs/common';

import { REALTIME_CONFIG, type RealtimeConfig } from './config/realtime.config';
import { HealthController } from './health/health.controller';

/** Holds sockets and group membership; emits only when the service tells it to. */
@Module({})
export class AppModule {
  static register(config: RealtimeConfig, bus: MessageBus): DynamicModule {
    return {
      module: AppModule,
      imports: [MessagingModule.forRoot({ bus })],
      controllers: [HealthController],
      providers: [{ provide: REALTIME_CONFIG, useValue: config }],
    };
  }
}
