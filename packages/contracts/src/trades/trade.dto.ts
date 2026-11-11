import type { IsoDateTime } from '../common/primitives';
import type { Page } from '../common/pagination';
import type { Side, TradeStatus } from './trade.model';

/** A trade as the HTTP API returns it to the web (mapped from {@link TradeRecord}). */
export interface TradeDto {
  id: string;
  tradeRef: string;
  symbol: string;
  side: Side;
  quantity: number;
  price: number;
  /** quantity x price, computed by the API for display. */
  notional: number;
  trader: string;
  book: string;
  counterparty: string;
  tradeTimestamp: IsoDateTime;
  status: TradeStatus;
  version: number;
  updatedAt: IsoDateTime;
}

export type TradePageDto = Page<TradeDto>;
