import type { MarketPrice } from './market-price.js';

/** Command-side port for the latest price per symbol. */
export interface PriceRepository {
  loadAll(): Promise<MarketPrice[]>;
  /** Upserts the latest price of each symbol. */
  saveAll(prices: readonly MarketPrice[]): Promise<void>;
  /** Inserts the given prices only for symbols that have none yet. */
  insertMissing(prices: readonly MarketPrice[]): Promise<number>;
}

export const PRICE_REPOSITORY = Symbol('PRICE_REPOSITORY');

/** Source of randomness for the walk, injectable so tests are deterministic. */
export type RandomSource = () => number;
export const RANDOM_SOURCE = Symbol('RANDOM_SOURCE');
