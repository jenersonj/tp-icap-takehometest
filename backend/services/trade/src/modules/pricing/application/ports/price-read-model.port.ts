import type { PriceRecord } from '@blotter/contracts';

/** Query-side port for prices; also used by the positions module for mark-to-market. */
export interface PriceReadModel {
  /** All symbols when `symbols` is omitted, sorted by symbol. */
  list(symbols?: readonly string[]): Promise<PriceRecord[]>;
}

export const PRICE_READ_MODEL = Symbol('PRICE_READ_MODEL');
