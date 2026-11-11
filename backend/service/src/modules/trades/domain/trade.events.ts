import type { DomainEvent } from '../../../shared/domain/domain-event.js';
import type { TradeSnapshot, TradeSnapshotField } from './trade-snapshot.js';

interface TradeEventBase extends DomainEvent {
  readonly tradeId: string;
  readonly tradeRef: string;
  /** Trade version after the change. */
  readonly version: number;
  readonly actorId: string;
}

export class TradeCreated implements TradeEventBase {
  readonly type = 'TradeCreated';
  constructor(
    readonly tradeId: string,
    readonly tradeRef: string,
    readonly version: number,
    readonly actorId: string,
    readonly after: TradeSnapshot,
    readonly occurredAt: Date,
  ) {}
}

export class TradeAmended implements TradeEventBase {
  readonly type = 'TradeAmended';
  constructor(
    readonly tradeId: string,
    readonly tradeRef: string,
    readonly version: number,
    readonly actorId: string,
    readonly before: TradeSnapshot,
    readonly after: TradeSnapshot,
    readonly changed: TradeSnapshotField[],
    readonly occurredAt: Date,
  ) {}
}

export class TradeCancelled implements TradeEventBase {
  readonly type = 'TradeCancelled';
  constructor(
    readonly tradeId: string,
    readonly tradeRef: string,
    readonly version: number,
    readonly actorId: string,
    readonly before: TradeSnapshot,
    readonly after: TradeSnapshot,
    readonly reason: string | undefined,
    readonly occurredAt: Date,
  ) {}
}

export type TradeEvent = TradeCreated | TradeAmended | TradeCancelled;
