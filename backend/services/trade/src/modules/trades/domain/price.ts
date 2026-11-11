const DECIMAL = /^(\d{1,12})(?:\.(\d{1,6}))?$/;
const MAX_PRICE = 1_000_000_000;

/**
 * A positive price with at most 6 decimal places, kept as a canonical decimal string
 * ("227.45", never "227.450000" or 227.45000000000002), matching Decimal(18, 6).
 */
export class Price {
  private constructor(readonly value: string) {}

  /** Returns an error message instead of throwing, so rules can collect every issue. */
  static parse(input: number | string): Price | string {
    const text = typeof input === 'number' ? numberToPlain(input) : input.trim();
    if (text === null) return 'Price must be a number';
    const match = DECIMAL.exec(text);
    if (!match) {
      return /^\d+\.\d{7,}$/.test(text)
        ? 'Price can have at most 6 decimal places'
        : 'Price must be a positive number';
    }
    const whole = match[1]!.replace(/^0+(?=\d)/, '');
    const fraction = (match[2] ?? '').replace(/0+$/, '');
    const canonical = fraction ? `${whole}.${fraction}` : whole;
    const numeric = Number(canonical);
    if (numeric <= 0) return 'Price must be positive';
    if (numeric > MAX_PRICE) return 'Price is too large';
    return new Price(canonical);
  }

  static of(input: number | string): Price {
    const result = Price.parse(input);
    if (typeof result === 'string') throw new Error(result);
    return result;
  }

  equals(other: Price): boolean {
    return this.value === other.value;
  }

  toNumber(): number {
    return Number(this.value);
  }

  toString(): string {
    return this.value;
  }
}

function numberToPlain(n: number): string | null {
  if (!Number.isFinite(n)) return null;
  if (n < 0) return `-${n}`;
  // toString gives the shortest round-trip form; exponent form means more than 6 dp or huge.
  const s = n.toString();
  return s.includes('e') ? n.toFixed(7) : s;
}
