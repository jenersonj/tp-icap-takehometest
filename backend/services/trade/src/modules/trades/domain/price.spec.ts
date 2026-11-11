import { describe, expect, it } from 'vitest';

import { Price } from './price.js';

describe('Price', () => {
  it.each([
    [227.45, '227.45'],
    ['227.450000', '227.45'],
    ['0007.5', '7.5'],
    [0.734215, '0.734215'],
    [100, '100'],
  ])('canonicalises %j to %s', (input, expected) => {
    expect(Price.of(input).value).toBe(expected);
  });

  it.each([
    [0, 'Price must be positive'],
    [-1, 'Price must be a positive number'],
    [1.1234567, 'Price can have at most 6 decimal places'],
    ['abc', 'Price must be a positive number'],
    [Number.NaN, 'Price must be a number'],
    [2e9, 'Price is too large'],
  ])('rejects %j', (input, message) => {
    expect(Price.parse(input)).toBe(message);
  });

  it('compares by value', () => {
    expect(Price.of('1.50').equals(Price.of(1.5))).toBe(true);
  });
});
