import type { TradeRecord } from '@blotter/contracts';
import type { TradeRow } from '@blotter/database';

import { Price } from '../domain/price.js';
import { Trade } from '../domain/trade.js';

/** Decimal -> plain decimal string (never exponent notation). */
export function decimalToString(value: { toFixed(): string }): string {
  return value.toFixed();
}

export function rowToTrade(row: TradeRow): Trade {
  return Trade.restore({
    id: row.id,
    tradeRef: row.tradeRef,
    symbol: row.symbol,
    side: row.side,
    quantity: row.quantity,
    price: Price.of(decimalToString(row.price)),
    trader: row.trader,
    book: row.book,
    counterparty: row.counterparty,
    tradeTimestamp: row.tradeTimestamp,
    status: row.status,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdById: row.createdById,
  });
}

export function rowToRecord(row: TradeRow): TradeRecord {
  return {
    id: row.id,
    tradeRef: row.tradeRef,
    symbol: row.symbol,
    side: row.side,
    quantity: row.quantity,
    price: Price.of(decimalToString(row.price)).value,
    trader: row.trader,
    book: row.book,
    counterparty: row.counterparty,
    tradeTimestamp: row.tradeTimestamp.toISOString(),
    status: row.status,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdById: row.createdById,
  };
}
