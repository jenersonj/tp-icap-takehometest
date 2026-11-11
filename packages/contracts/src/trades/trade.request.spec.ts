import { describe, expect, it } from 'vitest';

import {
  AmendTradeInputSchema,
  CancelTradeInputSchema,
  CreateTradeInputSchema,
  ListTradesQuerySchema,
} from './trade.request.js';

const validTrade = {
  symbol: 'aapl ',
  side: 'BUY',
  quantity: 5000,
  price: 227.45,
  trader: 'jsmith',
  book: 'EQUITIES_UK',
  counterparty: 'Goldman Sachs',
  tradeTimestamp: '2026-08-18T09:15:23Z',
};

describe('CreateTradeInputSchema', () => {
  it('accepts a valid trade and normalises symbol and trader', () => {
    const parsed = CreateTradeInputSchema.parse(validTrade);
    expect(parsed.symbol).toBe('AAPL');
    expect(parsed.trader).toBe('JSMITH');
  });

  it('allows tradeTimestamp to be omitted', () => {
    const { tradeTimestamp: _omit, ...rest } = validTrade;
    expect(CreateTradeInputSchema.safeParse(rest).success).toBe(true);
  });

  it.each([
    ['quantity', 0, 'Quantity must be positive'],
    ['quantity', -10, 'Quantity must be positive'],
    ['quantity', 1.5, 'Quantity must be a whole number'],
    ['price', 0, 'Price must be positive'],
    ['price', -1, 'Price must be positive'],
    ['price', 1.1234567, 'Price can have at most 6 decimal places'],
    ['trader', '', 'Trader is required'],
    ['side', 'HOLD', undefined],
    ['tradeTimestamp', 'yesterday', undefined],
  ])('rejects %s = %j', (field, value, message) => {
    const result = CreateTradeInputSchema.safeParse({ ...validTrade, [field]: value });
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) => i.path[0] === field);
    expect(issue).toBeDefined();
    if (message) expect(issue?.message).toBe(message);
  });

  it('accepts a price with exactly 6 decimal places', () => {
    expect(CreateTradeInputSchema.safeParse({ ...validTrade, price: 0.734215 }).success).toBe(true);
  });
});

describe('AmendTradeInputSchema', () => {
  it('requires a version and at least one change', () => {
    expect(AmendTradeInputSchema.safeParse({ version: 1, changes: {} }).success).toBe(false);
    expect(AmendTradeInputSchema.safeParse({ changes: { quantity: 10 } }).success).toBe(false);
    expect(AmendTradeInputSchema.safeParse({ version: 2, changes: { quantity: 10 } }).success).toBe(
      true,
    );
  });

  it('validates the changed fields with the create rules', () => {
    const result = AmendTradeInputSchema.safeParse({ version: 1, changes: { price: -5 } });
    expect(result.success).toBe(false);
  });
});

describe('CancelTradeInputSchema', () => {
  it('accepts an optional reason', () => {
    expect(CancelTradeInputSchema.parse({ version: 3 })).toEqual({ version: 3 });
    expect(CancelTradeInputSchema.parse({ version: 3, reason: ' fat finger ' }).reason).toBe(
      'fat finger',
    );
  });
});

describe('ListTradesQuerySchema', () => {
  it('applies defaults', () => {
    expect(ListTradesQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 100,
      sort: { field: 'tradeTimestamp', direction: 'desc' },
    });
  });

  it('coerces query-string numbers and parses ascending sort', () => {
    const q = ListTradesQuerySchema.parse({
      page: '3',
      pageSize: '50',
      sort: 'symbol',
      status: 'ACTIVE',
    });
    expect(q).toMatchObject({
      page: 3,
      pageSize: 50,
      status: 'ACTIVE',
      sort: { field: 'symbol', direction: 'asc' },
    });
  });

  it('treats empty filters as absent', () => {
    expect(ListTradesQuerySchema.parse({ symbol: '' }).symbol).toBeUndefined();
  });

  it('rejects unknown sort fields, huge pages and inverted date ranges', () => {
    expect(ListTradesQuerySchema.safeParse({ sort: '-password' }).success).toBe(false);
    expect(ListTradesQuerySchema.safeParse({ pageSize: '10000' }).success).toBe(false);
    expect(
      ListTradesQuerySchema.safeParse({ from: '2026-08-19T00:00:00Z', to: '2026-08-18T00:00:00Z' })
        .success,
    ).toBe(false);
  });
});
