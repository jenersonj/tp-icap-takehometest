import {
  Inject,
  Injectable,
  Logger,
  Module,
  type DynamicModule,
  type OnApplicationShutdown,
} from '@nestjs/common';

import { MESSAGE_BUS, type MessageBus } from '../core/message-bus.js';
import { RmqMessageBus, type RmqMessageBusOptions } from '../rmq/rmq-message-bus.js';

/** Either RabbitMQ settings, or a ready bus (the app's own RmqMessageBus, or InMemoryMessageBus in tests). */
export type MessagingModuleOptions = Omit<RmqMessageBusOptions, 'logger'> | { bus: MessageBus };

@Injectable()
class MessageBusShutdown implements OnApplicationShutdown {
  constructor(@Inject(MESSAGE_BUS) private readonly bus: MessageBus) {}

  async onApplicationShutdown(): Promise<void> {
    await this.bus.close();
  }
}

/**
 * Provides the {@link MessageBus} under the {@link MESSAGE_BUS} token. Apps depend on the
 * interface; only this module knows the bus is RabbitMQ.
 */
@Module({})
export class MessagingModule {
  static forRoot(options: MessagingModuleOptions): DynamicModule {
    const logger = new Logger('MessageBus');
    const bus =
      'bus' in options
        ? options.bus
        : new RmqMessageBus({
            ...options,
            logger: { error: (message, meta) => logger.error(message, meta) },
          });
    return {
      module: MessagingModule,
      global: true,
      providers: [{ provide: MESSAGE_BUS, useValue: bus }, MessageBusShutdown],
      exports: [MESSAGE_BUS],
    };
  }
}
