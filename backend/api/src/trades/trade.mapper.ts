import type {
  AuditEntryDto,
  AuditEntryRecord,
  TradeDto,
  TradePage,
  TradePageDto,
  TradeRecord,
} from '@blotter/contracts';

/** Drops service-only fields and turns decimal strings into numbers for the grid. */
export function toTradeDto(record: TradeRecord): TradeDto {
  const price = Number(record.price);
  return {
    id: record.id,
    tradeRef: record.tradeRef,
    symbol: record.symbol,
    side: record.side,
    quantity: record.quantity,
    price,
    notional: Math.round(record.quantity * price * 100) / 100,
    trader: record.trader,
    book: record.book,
    counterparty: record.counterparty,
    tradeTimestamp: record.tradeTimestamp,
    status: record.status,
    version: record.version,
    updatedAt: record.updatedAt,
  };
}

export function toTradePageDto(page: TradePage): TradePageDto {
  return { ...page, items: page.items.map(toTradeDto) };
}

/**
 * One row per change with a field-level diff. A CREATED row lists every field it set
 * (from null), so the panel shows what the trade started as.
 */
export function toAuditEntryDto(record: AuditEntryRecord): AuditEntryDto {
  const fields = record.action === 'CREATED' ? Object.keys(record.after) : record.changed;
  return {
    id: record.id,
    action: record.action,
    version: record.version,
    actor: record.actorName,
    reason: record.reason,
    at: record.at,
    changes: fields.map((field) => ({
      field,
      from: record.before?.[field] ?? null,
      to: record.after[field] ?? null,
    })),
  };
}
