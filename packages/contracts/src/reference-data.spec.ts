import { describe, expect, it } from 'vitest';

import { BOOKS, SYMBOLS, isKnownBook, isKnownSymbol } from './reference-data';

describe('reference data', () => {
  it('includes the symbols and books from the brief sample', () => {
    expect(SYMBOLS).toEqual(expect.arrayContaining(['AAPL', 'MSFT', 'TSLA']));
    expect(BOOKS).toEqual(expect.arrayContaining(['EQUITIES_UK', 'EQUITIES_US', 'TECH_GROWTH']));
  });

  it('guards known values', () => {
    expect(isKnownSymbol('AAPL')).toBe(true);
    expect(isKnownSymbol('toString')).toBe(false);
    expect(isKnownBook('EQUITIES_UK')).toBe(true);
    expect(isKnownBook('NOPE')).toBe(false);
  });
});
