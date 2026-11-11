import { MessagingModule, type MessageBus } from '@blotter/messaging';
import { Module, type DynamicModule } from '@nestjs/common';

import { BusTicketRedeemer, TICKET_REDEEMER } from './auth/ticket-redeemer.js';
import { RealtimeCommandsController } from './commands/realtime-commands.controller.js';
import { REALTIME_CONFIG, type RealtimeConfig } from './config/realtime.config.js';
import { REALTIME_GATEWAY } from './gateway/realtime-gateway.js';
import { SocketIoRealtimeGateway } from './gateway/socket-io.gateway.js';
import { HealthController } from './health/health.controller.js';

/** Holds sockets and group membership; emits only when the service tells it to. */
@Module({})
export class AppModule {
  static register(config: RealtimeConfig, bus: MessageBus): DynamicModule {
    return {
      module: AppModule,
      imports: [MessagingModule.forRoot({ bus })],
      controllers: [HealthController, RealtimeCommandsController],
      providers: [
        { provide: REALTIME_CONFIG, useValue: config },
        { provide: TICKET_REDEEMER, useClass: BusTicketRedeemer },
        SocketIoRealtimeGateway,
        { provide: REALTIME_GATEWAY, useExisting: SocketIoRealtimeGateway },
      ],
    };
  }
}
