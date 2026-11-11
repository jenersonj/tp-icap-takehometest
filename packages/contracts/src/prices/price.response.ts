import type { IsoDateTime } from '../common/primitives.js';

export interface PriceRecord {
  symbol: string;
  price: string;
  asOf: IsoDateTime;
}
