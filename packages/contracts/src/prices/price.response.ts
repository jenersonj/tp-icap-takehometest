import type { IsoDateTime } from '../common/primitives';

export interface PriceRecord {
  symbol: string;
  price: string;
  asOf: IsoDateTime;
}
