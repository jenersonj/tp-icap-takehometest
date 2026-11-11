import { Module } from '@nestjs/common';

import { PricingModule } from '../pricing/pricing.module.js';
import { POSITION_READ_MODEL } from './application/ports/position-read-model.port.js';
import { ListPositionsHandler } from './application/queries/list-positions.query.js';
import { PrismaPositionReadModel } from './infrastructure/prisma-position.read-model.js';
import { PositionsRpcController } from './interface/positions.rpc-controller.js';

@Module({
  imports: [PricingModule],
  controllers: [PositionsRpcController],
  providers: [
    ListPositionsHandler,
    { provide: POSITION_READ_MODEL, useClass: PrismaPositionReadModel },
  ],
})
export class PositionsModule {}
