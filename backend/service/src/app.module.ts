import { MessagingModule, type MessageBus } from '@blotter/messaging';
import { Module, type DynamicModule } from '@nestjs/common';

import { SERVICE_CONFIG, type ServiceConfig } from './config/service.config';
import { SystemModule } from './modules/system/system.module';

/**
 * One process hosting every domain module for now. Each module only talks to the others
 * through domain events or application ports, so any of them can move to its own process.
 */
@Module({})
export class AppModule {
  static register(config: ServiceConfig, bus: MessageBus): DynamicModule {
    return {
      module: AppModule,
      imports: [MessagingModule.forRoot({ bus }), SystemModule],
      providers: [{ provide: SERVICE_CONFIG, useValue: config }],
    };
  }
}
