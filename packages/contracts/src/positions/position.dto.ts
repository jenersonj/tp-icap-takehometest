import type { IsoDateTime } from '../common/primitives.js';

export interface PositionDto {
  symbol: string;
  netQuantity: number;
  averagePrice: number | null;
  lastPrice: number | null;
  priceAsOf: IsoDateTime | null;
  marketValue: number | null;
  unrealisedPnl: number | null;
  realisedPnl: number;
  tradeCount: number;
}

export interface PositionSummaryDto {
  positions: PositionDto[];
  totalUnrealisedPnl: number;
  totalRealisedPnl: number;
  totalMarketValue: number;
}
