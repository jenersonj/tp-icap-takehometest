import {
  PositionEvents,
  RealtimeGroup,
  TradeEvents,
  type PositionChangedEventData,
} from '@blotter/contracts';
import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';

import {
  REALTIME_PUBLISHER,
  type RealtimePublisher,
} from '../../../../shared/application/realtime-publisher.js';
import {
  TradeAmended,
  TradeCancelled,
  TradeCreated,
  type TradeEvent,
} from '../../domain/trade.events.js';

const EVENT_NAME = {
  TradeCreated: TradeEvents.CREATED,
  TradeAmended: TradeEvents.UPDATED,
  TradeCancelled: TradeEvents.CANCELLED,
} as const;

/**
 * After a trade change commits, tell realtime to notify the `trades` group and, for every
 * (book, symbol) position the change touched, the `positions` group. Payloads are ids only.
 */
@EventsHandler(TradeCreated, TradeAmended, TradeCancelled)
export class NotifyRealtimeOnTradeChange implements IEventHandler<TradeEvent> {
  private readonly logger = new Logger(NotifyRealtimeOnTradeChange.name);

  constructor(@Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher) {}

  async handle(event: TradeEvent): Promise<void> {
    try {
      await this.realtime.emitToGroup(RealtimeGroup.TRADES, EVENT_NAME[event.type], {
        id: event.tradeId,
        version: event.version,
      });
      for (const position of affectedPositions(event)) {
        await this.realtime.emitToGroup(RealtimeGroup.POSITIONS, PositionEvents.CHANGED, position);
      }
    } catch (error) {
      // The change is committed; clients recover by refetching on reconnect or Refresh.
      this.logger.warn(`Realtime notification for ${event.tradeRef} failed: ${String(error)}`);
    }
  }
}

export function affectedPositions(event: TradeEvent): PositionChangedEventData[] {
  const keys = new Map<string, PositionChangedEventData>();
  const add = (book: string, symbol: string) => keys.set(`${book}|${symbol}`, { book, symbol });
  add(event.after.book, event.after.symbol);
  if (event.type !== 'TradeCreated') add(event.before.book, event.before.symbol);
  return [...keys.values()];
}
