import { AuthEvents, type AuthExpiredEventData } from '../auth/events';
import { PositionEvents, type PositionChangedEventData } from '../positions/events';
import { PriceEvents, type PricesTickedEventData } from '../prices/events';
import { TradeEvents, type TradeChangedEventData } from '../trades/events';
import { RealtimeGroup } from './groups';

/**
 * Every event realtime can send to the web, with its payload. Payloads carry ids and
 * names only, never prices, quantities, counterparties or trader names.
 */
export interface RealtimeEventMap {
  [TradeEvents.CREATED]: TradeChangedEventData;
  [TradeEvents.UPDATED]: TradeChangedEventData;
  [TradeEvents.CANCELLED]: TradeChangedEventData;
  [PositionEvents.CHANGED]: PositionChangedEventData;
  [PriceEvents.TICKED]: PricesTickedEventData;
  [AuthEvents.EXPIRED]: AuthExpiredEventData;
}

export type RealtimeEventName = keyof RealtimeEventMap;

/** The group each event is delivered to; `null` means sent to a single client. */
export const REALTIME_EVENT_GROUP: Record<RealtimeEventName, RealtimeGroup | null> = {
  [TradeEvents.CREATED]: RealtimeGroup.TRADES,
  [TradeEvents.UPDATED]: RealtimeGroup.TRADES,
  [TradeEvents.CANCELLED]: RealtimeGroup.TRADES,
  [PositionEvents.CHANGED]: RealtimeGroup.POSITIONS,
  [PriceEvents.TICKED]: RealtimeGroup.PRICES,
  [AuthEvents.EXPIRED]: null,
};

export const REALTIME_EVENT_NAMES = Object.keys(REALTIME_EVENT_GROUP) as RealtimeEventName[];

export function isRealtimeEventName(value: unknown): value is RealtimeEventName {
  return typeof value === 'string' && value in REALTIME_EVENT_GROUP;
}
