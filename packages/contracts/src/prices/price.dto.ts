import type { IsoDateTime } from '../common/primitives.js';

export interface PriceDto {
  symbol: string;
  price: number;
  asOf: IsoDateTime;
}
