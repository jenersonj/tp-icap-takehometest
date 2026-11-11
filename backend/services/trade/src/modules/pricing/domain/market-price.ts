/** The latest mock market price for one symbol. */
export interface MarketPrice {
  symbol: string;
  price: number;
  asOf: Date;
}

/** Each step moves the price by at most this fraction, before mean reversion. */
export const MAX_STEP = 0.002;
/** Share of the gap back to the reference price closed on each step. */
export const MEAN_REVERSION = 0.01;
/** The walk never leaves [reference x FLOOR, reference x CAP]. */
export const FLOOR = 0.5;
export const CAP = 2;

/**
 * One step of the mock ticker: a uniform random shock of up to ±MAX_STEP, a small pull
 * back towards the reference price, clamped to a band around the reference so a long run
 * cannot drift to zero or to absurd values.
 */
export function nextPrice(current: number, reference: number, random: () => number): number {
  const shock = (random() * 2 - 1) * MAX_STEP;
  const pull = ((reference - current) / reference) * MEAN_REVERSION;
  const raw = current * (1 + shock + pull);
  return roundPrice(Math.min(Math.max(raw, reference * FLOOR), reference * CAP));
}

/** Pence-level stocks keep 4 decimal places, everything else 2 (always within Decimal(18, 6)). */
export function roundPrice(value: number): number {
  return Number(value.toFixed(value < 10 ? 4 : 2));
}

/** The starting prices: one per reference symbol, at its reference value. */
export function basePrices(references: Readonly<Record<string, number>>, now: Date): MarketPrice[] {
  return Object.entries(references).map(([symbol, price]) => ({ symbol, price, asOf: now }));
}

/**
 * Walks every reference symbol one step. Symbols without a stored price start from their
 * reference value; stored symbols that are no longer reference data are dropped.
 */
export function walkPrices(
  current: readonly MarketPrice[],
  references: Readonly<Record<string, number>>,
  random: () => number,
  now: Date,
): MarketPrice[] {
  const stored = new Map(current.map((p) => [p.symbol, p.price]));
  return Object.entries(references).map(([symbol, reference]) => ({
    symbol,
    price: nextPrice(stored.get(symbol) ?? reference, reference, random),
    asOf: now,
  }));
}
