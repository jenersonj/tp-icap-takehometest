import type { IsoDateTime } from '../common/primitives';

export interface PriceDto {
  symbol: string;
  price: number;
  asOf: IsoDateTime;
}
