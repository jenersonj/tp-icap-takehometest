import type { IsoDateTime } from '../common/primitives';

export interface PositionDto {
  symbol: string;
  netQuantity: number;
  averagePrice: number | null;
  lastPrice: number | null;
  priceAsOf: IsoDateTime | null;
  marketValue: number | null;
  unrealisedPnl: number | null;
  tradeCount: number;
}

export interface PositionSummaryDto {
  positions: PositionDto[];
  totalUnrealisedPnl: number;
  totalMarketValue: number;
}
