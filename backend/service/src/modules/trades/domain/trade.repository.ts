import type { Trade } from './trade.js';

/** Write-side persistence port for the Trade aggregate. */
export interface TradeRepository {
  findById(id: string): Promise<Trade | null>;
  /** Next human-readable reference, e.g. TRD-100501. */
  nextTradeRef(): Promise<string>;
  newId(): string;
  insert(trade: Trade): Promise<void>;
  /**
   * Saves a changed trade only if the stored version is still `expectedVersion`, the
   * version the aggregate was loaded at. Throws VERSION_CONFLICT otherwise.
   */
  update(trade: Trade, expectedVersion: number): Promise<void>;
}

export const TRADE_REPOSITORY = Symbol('TRADE_REPOSITORY');
