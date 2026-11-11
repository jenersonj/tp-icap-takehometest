import { Global, Module } from '@nestjs/common';

import { REALTIME_PUBLISHER } from '../application/realtime-publisher.js';
import { CLOCK, systemClock } from '../domain/clock.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { BusRealtimePublisher } from './realtime/bus-realtime-publisher.js';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    { provide: CLOCK, useValue: systemClock },
    { provide: REALTIME_PUBLISHER, useClass: BusRealtimePublisher },
  ],
  exports: [PrismaModule, CLOCK, REALTIME_PUBLISHER],
})
export class SharedInfrastructureModule {}
