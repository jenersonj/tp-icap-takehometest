/** Realtime events in the `trades` group. Payloads carry ids only; the web refetches. */
export const TradeEvents = {
  CREATED: 'trade.created',
  UPDATED: 'trade.updated',
  CANCELLED: 'trade.cancelled',
} as const;

export interface TradeChangedEventData {
  id: string;
  version: number;
}
