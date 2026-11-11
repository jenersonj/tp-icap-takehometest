import type { ListTradesQuery, TradePage, TradeRecord } from '@blotter/contracts';

/** Query-side port: reads straight from the tables without hydrating aggregates. */
export interface TradeReadModel {
  list(query: ListTradesQuery): Promise<TradePage>;
  get(id: string): Promise<TradeRecord | null>;
}

export const TRADE_READ_MODEL = Symbol('TRADE_READ_MODEL');
