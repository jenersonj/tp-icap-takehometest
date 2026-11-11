import type { Actor } from '@blotter/contracts';
import { describe, expect, it } from 'vitest';

import { DomainError } from '../../../shared/domain/domain-error.js';
import { Trade, type NewTradeInput } from './trade.js';
import { TradeAmended, TradeCancelled, TradeCreated } from './trade.events.js';

const now = new Date('2026-08-18T10:00:00Z');
const trader: Actor = {
  userId: 'u-1',
  username: 'jsmith',
  traderCode: 'JSMITH',
  role: 'TRADER',
  books: ['EQUITIES_UK', 'EQUITIES_US', 'TECH_GROWTH'],
};
const viewer: Actor = { ...trader, userId: 'u-2', role: 'VIEWER', books: [] };

const input: NewTradeInput = {
  symbol: 'aapl',
  side: 'BUY',
  quantity: 5000,
  price: 227.45,
  trader: 'jsmith',
  book: 'EQUITIES_US',
  counterparty: 'Goldman Sachs',
  tradeTimestamp: new Date('2026-08-18T09:15:23Z'),
};

const newTrade = () => Trade.create('t-1', 'TRD-100001', input, trader, now);

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    if (error instanceof DomainError) return error.code;
    throw error;
  }
  return undefined;
}

describe('Trade.create', () => {
  it('creates an ACTIVE trade at version 1 and raises TradeCreated', () => {
    const trade = newTrade();
    expect(trade.toState()).toMatchObject({
      symbol: 'AAPL',
      trader: 'JSMITH',
      status: 'ACTIVE',
      version: 1,
    });
    const [event] = trade.pullEvents();
    expect(event).toBeInstanceOf(TradeCreated);
    expect(event?.after).toMatchObject({ price: '227.45', quantity: 5000 });
    expect(trade.pullEvents()).toEqual([]);
  });

  it('defaults the trade time to now', () => {
    const { tradeTimestamp: _t, ...rest } = input;
    expect(Trade.create('t', 'r', rest, trader, now).toState().tradeTimestamp).toEqual(now);
  });

  it('collects every rule violation', () => {
    try {
      Trade.create(
        't',
        'r',
        { ...input, symbol: 'ZZZZ', quantity: 0, price: -1, book: 'NOPE' },
        trader,
        now,
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe('VALIDATION_FAILED');
      expect(((error as DomainError).details as { path: string }[]).map((i) => i.path)).toEqual([
        'symbol',
        'quantity',
        'price',
        'book',
      ]);
    }
  });

  it('rejects trades in the future, beyond clock skew', () => {
    const later = new Date(now.getTime() + 5 * 60_000);
    expect(
      codeOf(() => Trade.create('t', 'r', { ...input, tradeTimestamp: later }, trader, now)),
    ).toBe('VALIDATION_FAILED');
  });

  it('forbids viewers and books the trader is not entitled to', () => {
    expect(codeOf(() => Trade.create('t', 'r', input, viewer, now))).toBe('FORBIDDEN');
    expect(
      codeOf(() => Trade.create('t', 'r', { ...input, book: 'FINANCIALS' }, trader, now)),
    ).toBe('FORBIDDEN');
  });
});

describe('Trade.amend', () => {
  it('changes fields in place, bumps the version and records the diff', () => {
    const trade = newTrade();
    trade.pullEvents();
    trade.amend({ quantity: 6000, price: 228 }, 1, trader, now);
    expect(trade.version).toBe(2);
    const [event] = trade.pullEvents();
    expect(event).toBeInstanceOf(TradeAmended);
    const amended = event as TradeAmended;
    expect(amended.changed.sort()).toEqual(['price', 'quantity']);
    expect(amended.before.quantity).toBe(5000);
    expect(amended.after).toMatchObject({ quantity: 6000, price: '228' });
  });

  it('rejects a stale version', () => {
    expect(codeOf(() => newTrade().amend({ quantity: 1 }, 7, trader, now))).toBe(
      'VERSION_CONFLICT',
    );
  });

  it('rejects an amend that changes nothing', () => {
    expect(codeOf(() => newTrade().amend({ price: 227.45, symbol: 'AAPL' }, 1, trader, now))).toBe(
      'VALIDATION_FAILED',
    );
  });

  it('applies the same rules as create', () => {
    expect(codeOf(() => newTrade().amend({ quantity: -5 }, 1, trader, now))).toBe(
      'VALIDATION_FAILED',
    );
  });

  it('needs entitlement to the target book when moving books', () => {
    expect(codeOf(() => newTrade().amend({ book: 'FINANCIALS' }, 1, trader, now))).toBe(
      'FORBIDDEN',
    );
    const trade = newTrade();
    trade.amend({ book: 'TECH_GROWTH' }, 1, trader, now);
    expect(trade.book).toBe('TECH_GROWTH');
  });

  it('cannot amend a cancelled trade', () => {
    const trade = newTrade();
    trade.cancel(1, trader, now);
    expect(codeOf(() => trade.amend({ quantity: 1 }, 2, trader, now))).toBe('INVALID_STATE');
  });
});

describe('Trade.cancel', () => {
  it('sets CANCELLED, bumps the version and raises TradeCancelled with the reason', () => {
    const trade = newTrade();
    trade.pullEvents();
    trade.cancel(1, trader, now, 'fat finger');
    expect(trade.status).toBe('CANCELLED');
    expect(trade.version).toBe(2);
    const [event] = trade.pullEvents();
    expect(event).toBeInstanceOf(TradeCancelled);
    expect((event as TradeCancelled).reason).toBe('fat finger');
    expect((event as TradeCancelled).before.status).toBe('ACTIVE');
  });

  it('is final', () => {
    const trade = newTrade();
    trade.cancel(1, trader, now);
    expect(codeOf(() => trade.cancel(2, trader, now))).toBe('INVALID_STATE');
  });

  it('is forbidden for viewers', () => {
    expect(codeOf(() => newTrade().cancel(1, viewer, now))).toBe('FORBIDDEN');
  });
});
