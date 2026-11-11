import {
  isKnownBook,
  isKnownCounterparty,
  isKnownSymbol,
  Role,
  type Actor,
  type FieldIssue,
} from '@blotter/contracts';

import { DomainError } from '../../../shared/domain/domain-error.js';
import { Price } from './price.js';

/** Trades may be booked up to this far in the future to absorb clock skew between clients. */
export const MAX_FUTURE_SKEW_MS = 60_000;

export interface TradeFieldsInput {
  symbol: string;
  side: string;
  quantity: number;
  price: number | string;
  trader: string;
  book: string;
  counterparty: string;
  tradeTimestamp: Date;
}

export interface ValidTradeFields extends Omit<TradeFieldsInput, 'price' | 'side'> {
  side: 'BUY' | 'SELL';
  price: Price;
}

/**
 * Business rules for a trade's fields. All problems are collected and reported together
 * as VALIDATION_FAILED with one issue per field.
 */
export function validateTradeFields(input: TradeFieldsInput, now: Date): ValidTradeFields {
  const issues: FieldIssue[] = [];
  const symbol = input.symbol.trim().toUpperCase();
  const trader = input.trader.trim().toUpperCase();
  const book = input.book.trim();
  const counterparty = input.counterparty.trim();

  if (!isKnownSymbol(symbol))
    issues.push({ path: 'symbol', message: `Unknown symbol ${symbol || '(empty)'}` });
  if (input.side !== 'BUY' && input.side !== 'SELL')
    issues.push({ path: 'side', message: 'Side must be BUY or SELL' });
  if (!Number.isInteger(input.quantity))
    issues.push({ path: 'quantity', message: 'Quantity must be a whole number' });
  else if (input.quantity <= 0)
    issues.push({ path: 'quantity', message: 'Quantity must be positive' });
  else if (input.quantity > 100_000_000)
    issues.push({ path: 'quantity', message: 'Quantity is too large' });

  const price = Price.parse(input.price);
  if (typeof price === 'string') issues.push({ path: 'price', message: price });

  if (!/^[A-Z]{2,12}$/.test(trader))
    issues.push({ path: 'trader', message: 'Trader is required (2-12 letters)' });
  if (!isKnownBook(book))
    issues.push({ path: 'book', message: `Unknown book ${book || '(empty)'}` });
  if (!isKnownCounterparty(counterparty)) {
    issues.push({
      path: 'counterparty',
      message: `Unknown counterparty ${counterparty || '(empty)'}`,
    });
  }
  if (Number.isNaN(input.tradeTimestamp.getTime())) {
    issues.push({ path: 'tradeTimestamp', message: 'Trade time is not a valid date' });
  } else if (input.tradeTimestamp.getTime() > now.getTime() + MAX_FUTURE_SKEW_MS) {
    issues.push({ path: 'tradeTimestamp', message: 'Trade time cannot be in the future' });
  }

  if (issues.length > 0) throw DomainError.validation(issues);
  return {
    ...input,
    symbol,
    trader,
    book,
    counterparty,
    side: input.side as 'BUY' | 'SELL',
    price: price as Price,
  };
}

/** Only TRADERs write, and only into books they are entitled to. */
export function assertCanTradeBook(actor: Actor, book: string): void {
  if (actor.role !== Role.TRADER) throw DomainError.forbidden('Your role is read-only');
  if (!actor.books.includes(book))
    throw DomainError.forbidden(`You are not entitled to trade book ${book}`);
}
