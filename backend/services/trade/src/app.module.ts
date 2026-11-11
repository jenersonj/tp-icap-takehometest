import { MessagingModule, type MessageBus } from '@blotter/messaging';
import { Module, type DynamicModule } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { SERVICE_CONFIG, type ServiceConfig } from './config/service.config.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { SeedModule } from './modules/seed/seed.module.js';
import { SystemModule } from './modules/system/system.module.js';
import { TradesModule } from './modules/trades/trades.module.js';
import { SharedInfrastructureModule } from './shared/infrastructure/shared-infrastructure.module.js';

/**
 * One process hosting every domain module for now. Modules talk to each other only
 * through domain events or application ports, so any of them can move to its own process.
 */
@Module({})
export class AppModule {
  static register(config: ServiceConfig, bus: MessageBus): DynamicModule {
    return {
      module: AppModule,
      imports: [
        {
          module: ConfigModule,
          global: true,
          providers: [{ provide: SERVICE_CONFIG, useValue: config }],
          exports: [SERVICE_CONFIG],
        },
        MessagingModule.forRoot({ bus }),
        CqrsModule.forRoot(),
        SharedInfrastructureModule,
        SystemModule,
        TradesModule,
        AuditModule,
        SeedModule,
      ],
    };
  }
}

@Module({})
class ConfigModule {}
