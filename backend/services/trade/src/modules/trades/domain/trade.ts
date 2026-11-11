import { TradeStatus, type Actor, type Side, type TradeChanges } from '@blotter/contracts';

import { AggregateRoot } from '../../../shared/domain/domain-event.js';
import { DomainError } from '../../../shared/domain/domain-error.js';
import { Price } from './price.js';
import { assertCanTradeBook, validateTradeFields, type TradeFieldsInput } from './trade-rules.js';
import { diffSnapshots, type TradeSnapshot } from './trade-snapshot.js';
import { TradeAmended, TradeCancelled, TradeCreated, type TradeEvent } from './trade.events.js';

export interface TradeState {
  id: string;
  tradeRef: string;
  symbol: string;
  side: Side;
  quantity: number;
  price: Price;
  trader: string;
  book: string;
  counterparty: string;
  tradeTimestamp: Date;
  status: TradeStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
}

export interface NewTradeInput extends Omit<TradeFieldsInput, 'tradeTimestamp'> {
  /** Defaults to now. */
  tradeTimestamp?: Date;
}

/**
 * The Trade aggregate. Every state change goes through it: it enforces the business rules,
 * bumps the optimistic-concurrency version and raises the event the audit trail and
 * realtime notifications are built from.
 */
export class Trade extends AggregateRoot<TradeEvent> {
  private constructor(private state: TradeState) {
    super();
  }

  static create(
    id: string,
    tradeRef: string,
    input: NewTradeInput,
    actor: Actor,
    now: Date,
  ): Trade {
    const fields = validateTradeFields(
      { ...input, tradeTimestamp: input.tradeTimestamp ?? now },
      now,
    );
    assertCanTradeBook(actor, fields.book);
    const trade = new Trade({
      id,
      tradeRef,
      ...fields,
      status: TradeStatus.ACTIVE,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdById: actor.userId,
    });
    trade.raise(new TradeCreated(id, tradeRef, 1, actor.userId, trade.snapshot(), now));
    return trade;
  }

  /** Rebuilds a trade from storage; raises no events. */
  static restore(state: TradeState): Trade {
    return new Trade({ ...state });
  }

  amend(changes: TradeChanges, expectedVersion: number, actor: Actor, now: Date): void {
    this.assertVersion(expectedVersion);
    this.assertActive('amend');
    assertCanTradeBook(actor, this.state.book);

    const before = this.snapshot();
    const merged: TradeFieldsInput = {
      symbol: changes.symbol ?? this.state.symbol,
      side: changes.side ?? this.state.side,
      quantity: changes.quantity ?? this.state.quantity,
      price: changes.price ?? this.state.price.value,
      trader: changes.trader ?? this.state.trader,
      book: changes.book ?? this.state.book,
      counterparty: changes.counterparty ?? this.state.counterparty,
      tradeTimestamp: changes.tradeTimestamp
        ? new Date(changes.tradeTimestamp)
        : this.state.tradeTimestamp,
    };
    const fields = validateTradeFields(merged, now);
    // Moving a trade into another book needs entitlement to that book too.
    if (fields.book !== this.state.book) assertCanTradeBook(actor, fields.book);

    const next: TradeState = { ...this.state, ...fields };
    const after = snapshotOf(next);
    const changed = diffSnapshots(before, after);
    if (changed.length === 0) {
      throw DomainError.validation([{ path: 'changes', message: 'Nothing changed' }]);
    }

    this.state = { ...next, version: this.state.version + 1, updatedAt: now };
    this.raise(
      new TradeAmended(
        this.id,
        this.tradeRef,
        this.version,
        actor.userId,
        before,
        after,
        changed,
        now,
      ),
    );
  }

  /** CANCELLED is final (decision 8): there is no reinstate. */
  cancel(expectedVersion: number, actor: Actor, now: Date, reason?: string): void {
    this.assertVersion(expectedVersion);
    this.assertActive('cancel');
    assertCanTradeBook(actor, this.state.book);

    const before = this.snapshot();
    this.state = {
      ...this.state,
      status: TradeStatus.CANCELLED,
      version: this.state.version + 1,
      updatedAt: now,
    };
    this.raise(
      new TradeCancelled(
        this.id,
        this.tradeRef,
        this.version,
        actor.userId,
        before,
        this.snapshot(),
        reason,
        now,
      ),
    );
  }

  get id(): string {
    return this.state.id;
  }

  get tradeRef(): string {
    return this.state.tradeRef;
  }

  get version(): number {
    return this.state.version;
  }

  get status(): TradeStatus {
    return this.state.status;
  }

  get book(): string {
    return this.state.book;
  }

  get symbol(): string {
    return this.state.symbol;
  }

  toState(): Readonly<TradeState> {
    return { ...this.state };
  }

  snapshot(): TradeSnapshot {
    return snapshotOf(this.state);
  }

  private assertVersion(expected: number): void {
    if (expected !== this.state.version)
      throw DomainError.versionConflict(expected, this.state.version);
  }

  private assertActive(action: 'amend' | 'cancel'): void {
    if (this.state.status !== TradeStatus.ACTIVE) {
      throw DomainError.invalidState(
        `A cancelled trade cannot be ${action === 'amend' ? 'amended' : 'cancelled again'}`,
      );
    }
  }
}

function snapshotOf(state: Pick<TradeState, keyof TradeSnapshot>): TradeSnapshot {
  return {
    symbol: state.symbol,
    side: state.side,
    quantity: state.quantity,
    price: state.price.value,
    trader: state.trader,
    book: state.book,
    counterparty: state.counterparty,
    tradeTimestamp: state.tradeTimestamp.toISOString(),
    status: state.status,
  };
}
