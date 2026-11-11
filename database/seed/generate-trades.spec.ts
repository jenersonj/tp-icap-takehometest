import {
  BOOKS,
  COUNTERPARTIES,
  SYMBOLS,
  TRADER_CODES,
  CreateTradeInputSchema,
} from '@blotter/contracts';
import { describe, expect, it } from 'vitest';

import { formatTradeRef, generateTrades } from './generate-trades';

const now = new Date('2026-08-18T17:00:00Z'); // a Tuesday

describe('generateTrades', () => {
  it('generates the requested number of trades with sequential refs in time order', () => {
    const trades = generateTrades({ count: 250, now });
    expect(trades).toHaveLength(250);
    expect(trades[0]?.tradeRef).toBe('TRD-100001');
    expect(trades[249]?.tradeRef).toBe('TRD-100250');
    for (let i = 1; i < trades.length; i++) {
      expect(trades[i]!.tradeTimestamp.getTime()).toBeGreaterThanOrEqual(
        trades[i - 1]!.tradeTimestamp.getTime(),
      );
    }
  });

  it('is reproducible for a given seed', () => {
    expect(generateTrades({ count: 20, now, seed: 7 })).toEqual(
      generateTrades({ count: 20, now, seed: 7 }),
    );
    expect(generateTrades({ count: 20, now, seed: 7 })).not.toEqual(
      generateTrades({ count: 20, now, seed: 8 }),
    );
  });

  it('uses reference data and passes the create-trade validation rules', () => {
    for (const t of generateTrades({ count: 500, now })) {
      expect(SYMBOLS).toContain(t.symbol);
      expect(BOOKS).toContain(t.book);
      expect(COUNTERPARTIES).toContain(t.counterparty);
      expect(TRADER_CODES).toContain(t.trader);
      const parsed = CreateTradeInputSchema.safeParse({
        ...t,
        price: Number(t.price),
        tradeTimestamp: t.tradeTimestamp.toISOString(),
      });
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
  });

  it('only books trades on weekdays during the session, never in the future', () => {
    for (const t of generateTrades({ count: 500, now })) {
      expect([1, 2, 3, 4, 5]).toContain(t.tradeTimestamp.getUTCDay());
      expect(t.tradeTimestamp.getTime()).toBeLessThanOrEqual(now.getTime());
      const hour = t.tradeTimestamp.getUTCHours();
      expect(hour).toBeGreaterThanOrEqual(8);
      expect(hour).toBeLessThanOrEqual(16);
    }
  });

  it('includes some cancelled trades and both sides', () => {
    const trades = generateTrades({ count: 500, now });
    const cancelled = trades.filter((t) => t.status === 'CANCELLED').length;
    expect(cancelled).toBeGreaterThan(10);
    expect(cancelled).toBeLessThan(100);
    expect(new Set(trades.map((t) => t.side))).toEqual(new Set(['BUY', 'SELL']));
  });

  it('formats refs', () => {
    expect(formatTradeRef(42)).toBe('TRD-000042');
  });
});
