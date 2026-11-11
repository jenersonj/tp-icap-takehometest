import type { IsoDateTime } from '../common/primitives.js';

/**
 * Net position per symbol over ACTIVE trades, computed on request (decision 6).
 * Decimal values are strings to keep precision across the wire.
 */
export interface PositionRecord {
  symbol: string;
  /** Signed: BUY adds, SELL subtracts. */
  netQuantity: number;
  /** Volume-weighted average price of the open quantity, or null when flat. */
  averagePrice: string | null;
  lastPrice: string | null;
  priceAsOf: IsoDateTime | null;
  /** netQuantity x lastPrice. */
  marketValue: string | null;
  /** netQuantity x (lastPrice - averagePrice). */
  unrealisedPnl: string | null;
  tradeCount: number;
}
