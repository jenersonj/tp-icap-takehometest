import { describe, expect, it, vi } from 'vitest';

import { formatMoney, formatPrice, formatQty, signOf } from './format';
import { throttle } from './throttle';

describe('format', () => {
  it('formats prices, quantities and signed money', () => {
    expect(formatPrice(227.45)).toBe('227.45');
    expect(formatPrice(0.7342)).toBe('0.7342');
    expect(formatQty(1234567)).toBe('1,234,567');
    expect(formatMoney(1500.5, { signed: true })).toBe('+1,500.50');
    expect(formatMoney(-2)).toBe('-2.00');
    expect(formatMoney(null)).toBe('—');
    expect(signOf(-3)).toBe(-1);
    expect(signOf(0)).toBe(0);
  });
});

describe('throttle', () => {
  it('runs at most once per window with a trailing call', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const t = throttle(fn, 1000);
    t(1);
    t(2);
    t(3);
    expect(fn.mock.calls).toEqual([[1]]);
    vi.advanceTimersByTime(1000);
    expect(fn.mock.calls).toEqual([[1], [3]]);
    vi.useRealTimers();
  });
});
