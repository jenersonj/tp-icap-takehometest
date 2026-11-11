import type { PriceRecord } from '@blotter/contracts';
import { describe, expect, it } from 'vitest';

import type { PriceReadModel } from '../../pricing/application/ports/price-read-model.port.js';
import type { PositionTotals } from '../domain/position.js';
import type { PositionReadModel } from './ports/position-read-model.port.js';
import { ListPositionsHandler, ListPositionsQuery } from './queries/list-positions.query.js';

const asOf = '2026-11-11T10:00:00.000Z';

function setup(totals: PositionTotals[], prices: PriceRecord[]) {
  const books: (string | undefined)[] = [];
  const priceCalls: (readonly string[] | undefined)[] = [];
  const positions: PositionReadModel = {
    totalsBySymbol: (book) => {
      books.push(book);
      return Promise.resolve(totals);
    },
  };
  const priceModel: PriceReadModel = {
    list: (symbols) => {
      priceCalls.push(symbols);
      return Promise.resolve(prices.filter((p) => !symbols || symbols.includes(p.symbol)));
    },
  };
  return { handler: new ListPositionsHandler(positions, priceModel), books, priceCalls };
}

describe('ListPositionsHandler', () => {
  it('marks each symbol to the latest price and formats decimals as strings', async () => {
    const { handler, books, priceCalls } = setup(
      [
        {
          symbol: 'AAPL',
          buyQuantity: 100,
          buyNotional: 1000,
          sellQuantity: 40,
          sellNotional: 600,
          tradeCount: 3,
        },
      ],
      [{ symbol: 'AAPL', price: '12.5', asOf }],
    );

    const [position] = await handler.execute(new ListPositionsQuery('EQUITIES_US'));

    expect(books).toEqual(['EQUITIES_US']);
    expect(priceCalls).toEqual([['AAPL']]);
    expect(position).toEqual({
      symbol: 'AAPL',
      netQuantity: 60,
      averagePrice: '10',
      lastPrice: '12.5',
      priceAsOf: asOf,
      marketValue: '750',
      unrealisedPnl: '150',
      realisedPnl: '200',
      tradeCount: 3,
    });
  });

  it('returns nulls for symbols without a market price', async () => {
    const { handler } = setup(
      [
        {
          symbol: 'MSFT',
          buyQuantity: 3,
          buyNotional: 10,
          sellQuantity: 0,
          sellNotional: 0,
          tradeCount: 1,
        },
      ],
      [],
    );
    const [position] = await handler.execute(new ListPositionsQuery());
    expect(position).toMatchObject({
      averagePrice: '3.333333',
      lastPrice: null,
      priceAsOf: null,
      marketValue: null,
      unrealisedPnl: null,
      realisedPnl: '0',
    });
  });

  it('skips the price lookup when there are no trades', async () => {
    const { handler, priceCalls } = setup([], []);
    await expect(handler.execute(new ListPositionsQuery())).resolves.toEqual([]);
    expect(priceCalls).toEqual([]);
  });
});
