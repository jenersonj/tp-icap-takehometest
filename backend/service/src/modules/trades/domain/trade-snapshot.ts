import type { Side, TradeStatus } from '@blotter/contracts';

/** Business fields of a trade as stored in audit rows (JSON-safe). */
export interface TradeSnapshot {
  symbol: string;
  side: Side;
  quantity: number;
  price: string;
  trader: string;
  book: string;
  counterparty: string;
  tradeTimestamp: string;
  status: TradeStatus;
}

export type TradeSnapshotField = keyof TradeSnapshot;

export function diffSnapshots(before: TradeSnapshot, after: TradeSnapshot): TradeSnapshotField[] {
  return (Object.keys(after) as TradeSnapshotField[]).filter(
    (field) => before[field] !== after[field],
  );
}
