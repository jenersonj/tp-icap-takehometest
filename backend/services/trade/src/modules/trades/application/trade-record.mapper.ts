import type { TradeRecord } from '@blotter/contracts';

import type { Trade } from '../domain/trade.js';

export function toTradeRecord(trade: Trade): TradeRecord {
  const s = trade.toState();
  return {
    id: s.id,
    tradeRef: s.tradeRef,
    symbol: s.symbol,
    side: s.side,
    quantity: s.quantity,
    price: s.price.value,
    trader: s.trader,
    book: s.book,
    counterparty: s.counterparty,
    tradeTimestamp: s.tradeTimestamp.toISOString(),
    status: s.status,
    version: s.version,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    createdById: s.createdById,
  };
}
