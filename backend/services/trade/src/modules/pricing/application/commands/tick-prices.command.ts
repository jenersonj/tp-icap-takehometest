import { PriceEvents, RealtimeGroup, SYMBOL_REFERENCE_PRICES } from '@blotter/contracts';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import {
  REALTIME_PUBLISHER,
  type RealtimePublisher,
} from '../../../../shared/application/realtime-publisher.js';
import { CLOCK, type Clock } from '../../../../shared/domain/clock.js';
import { walkPrices, type MarketPrice } from '../../domain/market-price.js';
import {
  PRICE_REPOSITORY,
  RANDOM_SOURCE,
  type PriceRepository,
  type RandomSource,
} from '../../domain/price.repository.js';

/** One tick of the mock market: walk every symbol, store it, tell the `prices` group. */
export class TickPricesCommand {}

@CommandHandler(TickPricesCommand)
export class TickPricesHandler implements ICommandHandler<TickPricesCommand, MarketPrice[]> {
  constructor(
    @Inject(PRICE_REPOSITORY) private readonly prices: PriceRepository,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(RANDOM_SOURCE) private readonly random: RandomSource,
  ) {}

  async execute(): Promise<MarketPrice[]> {
    const now = this.clock.now();
    const next = walkPrices(await this.prices.loadAll(), SYMBOL_REFERENCE_PRICES, this.random, now);
    await this.prices.saveAll(next);
    // Thin event: symbol names and a timestamp only; the web refetches prices and positions.
    await this.realtime.emitToGroup(RealtimeGroup.PRICES, PriceEvents.TICKED, {
      symbols: next.map((p) => p.symbol),
      asOf: now.toISOString(),
    });
    return next;
  }
}
