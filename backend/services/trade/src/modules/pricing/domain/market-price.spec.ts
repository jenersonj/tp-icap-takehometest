import { describe, expect, it } from 'vitest';

import {
  CAP,
  FLOOR,
  MAX_STEP,
  basePrices,
  nextPrice,
  roundPrice,
  walkPrices,
} from './market-price.js';

const now = new Date('2026-11-11T10:00:00Z');
const constant = (value: number) => () => value;

describe('nextPrice', () => {
  it('stays put with a neutral shock at the reference price', () => {
    expect(nextPrice(100, 100, constant(0.5))).toBe(100);
  });

  it('moves by at most MAX_STEP plus the mean-reversion pull', () => {
    const up = nextPrice(100, 100, constant(1));
    const down = nextPrice(100, 100, constant(0));
    expect(up).toBeCloseTo(100 * (1 + MAX_STEP), 2);
    expect(down).toBeCloseTo(100 * (1 - MAX_STEP), 2);
  });

  it('pulls a drifted price back towards the reference', () => {
    expect(nextPrice(150, 100, constant(0.5))).toBeLessThan(150);
    expect(nextPrice(60, 100, constant(0.5))).toBeGreaterThan(60);
  });

  it('never leaves the band around the reference, however long it runs', () => {
    let price = 100;
    for (let i = 0; i < 5000; i++) price = nextPrice(price, 100, constant(1));
    expect(price).toBeLessThanOrEqual(100 * CAP);
    price = 100;
    for (let i = 0; i < 5000; i++) price = nextPrice(price, 100, constant(0));
    expect(price).toBeGreaterThanOrEqual(100 * FLOOR);
    expect(price).toBeGreaterThan(0);
  });
});

describe('roundPrice', () => {
  it('keeps 4 dp below 10 and 2 dp above', () => {
    expect(roundPrice(0.734_249)).toBe(0.7342);
    expect(roundPrice(227.456_7)).toBe(227.46);
  });
});

describe('walkPrices', () => {
  const references = { AAPL: 200, 'VOD.L': 0.75 };

  it('starts missing symbols from the reference and drops unknown ones', () => {
    const next = walkPrices(
      [{ symbol: 'OLD', price: 1, asOf: now }],
      references,
      constant(0.5),
      now,
    );
    expect(next).toEqual([
      { symbol: 'AAPL', price: 200, asOf: now },
      { symbol: 'VOD.L', price: 0.75, asOf: now },
    ]);
  });

  it('walks from the stored price', () => {
    const [aapl] = walkPrices(
      [{ symbol: 'AAPL', price: 210, asOf: now }],
      references,
      constant(1),
      now,
    );
    expect(aapl!.price).toBeGreaterThan(210);
  });
});

describe('basePrices', () => {
  it('returns one price per reference symbol', () => {
    expect(basePrices({ AAPL: 200 }, now)).toEqual([{ symbol: 'AAPL', price: 200, asOf: now }]);
  });
});
