import type { IsoDateTime } from '../common/primitives.js';
import type { Page } from '../common/pagination.js';
import type { Side, TradeStatus } from './trade.model.js';

/**
 * A trade as the service returns it over RPC. `price` is a decimal string so no precision
 * is lost between Postgres Decimal(18, 6) and the API.
 */
export interface TradeRecord {
  id: string;
  tradeRef: string;
  symbol: string;
  side: Side;
  quantity: number;
  price: string;
  trader: string;
  book: string;
  counterparty: string;
  tradeTimestamp: IsoDateTime;
  status: TradeStatus;
  version: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  createdById: string | null;
}

export type TradePage = Page<TradeRecord>;
