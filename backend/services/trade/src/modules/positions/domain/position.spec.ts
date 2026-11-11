import { describe, expect, it } from 'vitest';

import { formatDecimal, valuePosition, type PositionTotals } from './position.js';

const totals = (over: Partial<PositionTotals>): PositionTotals => ({
  symbol: 'AAPL',
  buyQuantity: 0,
  buyNotional: 0,
  sellQuantity: 0,
  sellNotional: 0,
  tradeCount: 1,
  ...over,
});

describe('valuePosition', () => {
  it('values a long position at the average buy price', () => {
    // 100 @ 10 and 300 @ 20: average 17.5
    const v = valuePosition(totals({ buyQuantity: 400, buyNotional: 7000, tradeCount: 2 }), 20);
    expect(v).toEqual({
      netQuantity: 400,
      averagePrice: 17.5,
      marketValue: 8000,
      unrealisedPnl: 1000,
      realisedPnl: 0,
    });
  });

  it('realises the matched quantity and keeps the rest open', () => {
    // bought 100 @ 10, sold 40 @ 15: 40 x 5 realised, 60 long @ 10
    const v = valuePosition(
      totals({ buyQuantity: 100, buyNotional: 1000, sellQuantity: 40, sellNotional: 600 }),
      12,
    );
    expect(v.realisedPnl).toBe(200);
    expect(v.netQuantity).toBe(60);
    expect(v.averagePrice).toBe(10);
    expect(v.unrealisedPnl).toBe(120);
  });

  it('values a short position at the average sell price', () => {
    const v = valuePosition(totals({ sellQuantity: 50, sellNotional: 1000 }), 18);
    expect(v.netQuantity).toBe(-50);
    expect(v.averagePrice).toBe(20);
    expect(v.unrealisedPnl).toBe(100); // short 50 from 20, now 18
    expect(v.marketValue).toBe(-900);
  });

  it('has no average price and no unrealised P&L when flat', () => {
    const v = valuePosition(
      totals({ buyQuantity: 10, buyNotional: 100, sellQuantity: 10, sellNotional: 80 }),
      9,
    );
    expect(v).toMatchObject({
      netQuantity: 0,
      averagePrice: null,
      unrealisedPnl: 0,
      marketValue: 0,
    });
    expect(v.realisedPnl).toBe(-20);
  });

  it('leaves market value and unrealised P&L null without a price', () => {
    const v = valuePosition(totals({ buyQuantity: 10, buyNotional: 100 }));
    expect(v.marketValue).toBeNull();
    expect(v.unrealisedPnl).toBeNull();
    expect(v.averagePrice).toBe(10);
  });
});

describe('formatDecimal', () => {
  it('trims trailing zeros and never returns -0', () => {
    expect(formatDecimal(17.5, 6)).toBe('17.5');
    expect(formatDecimal(1000, 2)).toBe('1000');
    expect(formatDecimal(-0.001, 2)).toBe('0');
    expect(formatDecimal(1 / 3, 6)).toBe('0.333333');
  });
});
