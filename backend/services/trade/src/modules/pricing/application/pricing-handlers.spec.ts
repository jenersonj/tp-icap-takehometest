import { PriceEvents, SYMBOLS, type PriceRecord } from '@blotter/contracts';
import { describe, expect, it } from 'vitest';

import { RecordingRealtimePublisher } from '../../../../test/fakes.js';
import { FixedClock } from '../../../shared/domain/clock.js';
import type { MarketPrice } from '../domain/market-price.js';
import type { PriceRepository } from '../domain/price.repository.js';
import { TickPricesHandler } from './commands/tick-prices.command.js';
import type { PriceReadModel } from './ports/price-read-model.port.js';
import { ListPricesHandler, ListPricesQuery } from './queries/list-prices.query.js';

const now = new Date('2026-11-11T10:00:00Z');

class InMemoryPrices implements PriceRepository {
  readonly bySymbol = new Map<string, MarketPrice>();

  loadAll(): Promise<MarketPrice[]> {
    return Promise.resolve([...this.bySymbol.values()]);
  }

  saveAll(prices: readonly MarketPrice[]): Promise<void> {
    for (const p of prices) this.bySymbol.set(p.symbol, p);
    return Promise.resolve();
  }

  insertMissing(prices: readonly MarketPrice[]): Promise<number> {
    const missing = prices.filter((p) => !this.bySymbol.has(p.symbol));
    for (const p of missing) this.bySymbol.set(p.symbol, p);
    return Promise.resolve(missing.length);
  }
}

describe('TickPricesHandler', () => {
  it('walks and stores every reference symbol, then emits a thin prices.ticked', async () => {
    const prices = new InMemoryPrices();
    prices.bySymbol.set('AAPL', { symbol: 'AAPL', price: 230, asOf: new Date(0) });
    const realtime = new RecordingRealtimePublisher();
    const handler = new TickPricesHandler(prices, realtime, new FixedClock(now), () => 1);

    const next = await handler.execute();

    expect(next.map((p) => p.symbol)).toEqual(SYMBOLS);
    expect(prices.bySymbol.get('AAPL')!.price).toBeGreaterThan(230);
    expect(prices.bySymbol.get('AAPL')!.asOf).toEqual(now);
    expect(realtime.emits).toEqual([
      {
        target: 'group:prices',
        event: PriceEvents.TICKED,
        data: { symbols: SYMBOLS, asOf: now.toISOString() },
      },
    ]);
  });
});

describe('ListPricesHandler', () => {
  const rows: PriceRecord[] = [{ symbol: 'AAPL', price: '230', asOf: now.toISOString() }];

  it('passes the symbol filter through, treating an empty list as all symbols', async () => {
    const calls: (readonly string[] | undefined)[] = [];
    const readModel: PriceReadModel = {
      list: (symbols) => {
        calls.push(symbols);
        return Promise.resolve(rows);
      },
    };
    const handler = new ListPricesHandler(readModel);
    await expect(handler.execute(new ListPricesQuery(['AAPL']))).resolves.toBe(rows);
    await handler.execute(new ListPricesQuery([]));
    await handler.execute(new ListPricesQuery());
    expect(calls).toEqual([['AAPL'], undefined, undefined]);
  });
});
