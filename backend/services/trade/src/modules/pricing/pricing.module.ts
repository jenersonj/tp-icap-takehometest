import { Module } from '@nestjs/common';

import { TickPricesHandler } from './application/commands/tick-prices.command.js';
import { PRICE_READ_MODEL } from './application/ports/price-read-model.port.js';
import { ListPricesHandler } from './application/queries/list-prices.query.js';
import { PRICE_REPOSITORY, RANDOM_SOURCE } from './domain/price.repository.js';
import { PrismaPriceReadModel } from './infrastructure/prisma-price.read-model.js';
import { PrismaPriceRepository } from './infrastructure/prisma-price.repository.js';
import { PriceTicker } from './infrastructure/price-ticker.js';
import { PricingRpcController } from './interface/pricing.rpc-controller.js';

@Module({
  controllers: [PricingRpcController],
  providers: [
    TickPricesHandler,
    ListPricesHandler,
    PriceTicker,
    { provide: RANDOM_SOURCE, useValue: Math.random },
    { provide: PRICE_REPOSITORY, useClass: PrismaPriceRepository },
    { provide: PRICE_READ_MODEL, useClass: PrismaPriceReadModel },
  ],
  exports: [PRICE_READ_MODEL],
})
export class PricingModule {}
