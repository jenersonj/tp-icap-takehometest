import { describe, expect, it } from 'vitest';

import { positionColumns, signClass, totalRow } from './positions-grid';

describe('positions grid', () => {
  it('colours values by sign', () => {
    expect(signClass(12.5)).toBe('text-buy');
    expect(signClass(-1)).toBe('text-sell');
    expect(signClass(0)).toBe('');
    expect(signClass(null)).toBe('');
  });

  it('builds the pinned totals row from the summary', () => {
    expect(
      totalRow({
        positions: [
          {
            symbol: 'AAPL',
            netQuantity: 10,
            averagePrice: 1,
            lastPrice: 2,
            priceAsOf: null,
            marketValue: 20,
            unrealisedPnl: 10,
            realisedPnl: 0,
            tradeCount: 3,
          },
          {
            symbol: 'MSFT',
            netQuantity: -5,
            averagePrice: 4,
            lastPrice: 3,
            priceAsOf: null,
            marketValue: -15,
            unrealisedPnl: 5,
            realisedPnl: -2,
            tradeCount: 2,
          },
        ],
        totalMarketValue: 5,
        totalUnrealisedPnl: 15,
        totalRealisedPnl: -2,
      }),
    ).toMatchObject({
      isTotal: true,
      symbol: 'Total',
      marketValue: 5,
      unrealisedPnl: 15,
      realisedPnl: -2,
      tradeCount: 5,
    });
  });

  it('formats and colours the P&L columns, and leaves net qty blank on the totals row', () => {
    const col = (field: string) => positionColumns.find((c) => c.field === field)!;
    const fmt = (field: string, value: number | null, isTotal = false) =>
      (col(field).valueFormatter as (p: unknown) => string)({ value, data: { isTotal } });
    expect(fmt('unrealisedPnl', 8648.31)).toBe('+8,648.31');
    expect(fmt('realisedPnl', -1200)).toBe('-1,200.00');
    expect(fmt('netQuantity', -2737)).toBe('-2,737');
    expect(fmt('netQuantity', 0, true)).toBe('');
    expect(fmt('lastPrice', null)).toBe('');
    expect((col('unrealisedPnl').cellClass as (p: unknown) => string)({ value: -3 })).toBe(
      'text-sell',
    );
    expect(col('lastPrice').enableCellChangeFlash).toBe(true);
  });
});
