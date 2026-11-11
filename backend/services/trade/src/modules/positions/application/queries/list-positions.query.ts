import type { PositionRecord } from '@blotter/contracts';
import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import {
  PRICE_READ_MODEL,
  type PriceReadModel,
} from '../../../pricing/application/ports/price-read-model.port.js';
import { formatDecimal, valuePosition } from '../../domain/position.js';
import { POSITION_READ_MODEL, type PositionReadModel } from '../ports/position-read-model.port.js';

/** Money to the cent, average prices to the 6 dp the trade prices allow. */
const MONEY_DP = 2;
const PRICE_DP = 6;

export class ListPositionsQuery {
  constructor(readonly book?: string) {}
}

/** Net position and P&L by symbol, marked to the current mock market price. */
@QueryHandler(ListPositionsQuery)
export class ListPositionsHandler implements IQueryHandler<ListPositionsQuery, PositionRecord[]> {
  constructor(
    @Inject(POSITION_READ_MODEL) private readonly positions: PositionReadModel,
    @Inject(PRICE_READ_MODEL) private readonly prices: PriceReadModel,
  ) {}

  async execute({ book }: ListPositionsQuery): Promise<PositionRecord[]> {
    const totals = await this.positions.totalsBySymbol(book);
    if (totals.length === 0) return [];
    const prices = new Map(
      (await this.prices.list(totals.map((t) => t.symbol))).map((p) => [p.symbol, p]),
    );

    return totals.map((t) => {
      const price = prices.get(t.symbol);
      const v = valuePosition(t, price ? Number(price.price) : undefined);
      const money = (n: number | null) => (n === null ? null : formatDecimal(n, MONEY_DP));
      return {
        symbol: t.symbol,
        netQuantity: v.netQuantity,
        averagePrice: v.averagePrice === null ? null : formatDecimal(v.averagePrice, PRICE_DP),
        lastPrice: price?.price ?? null,
        priceAsOf: price?.asOf ?? null,
        marketValue: money(v.marketValue),
        unrealisedPnl: money(v.unrealisedPnl),
        realisedPnl: formatDecimal(v.realisedPnl, MONEY_DP),
        tradeCount: t.tradeCount,
      };
    });
  }
}
