import {
  CreateTradeInputSchema,
  type CreateTradeInput,
  type TradeChanges,
  type TradeDto,
} from '@blotter/contracts';
import { z } from 'zod';

import { fromDateTimeLocal, toDateTimeLocal } from '@/shared/lib/format';

/** The form edits the trade time as a local `datetime-local` string; empty means "now". */
export const TradeFormSchema = CreateTradeInputSchema.extend({
  tradeTimestamp: z
    .string()
    .refine((v) => v === '' || fromDateTimeLocal(v) !== undefined, 'Trade time is not valid'),
});
export type TradeFormInput = z.input<typeof TradeFormSchema>;
export type TradeFormValues = z.output<typeof TradeFormSchema>;

export function toCreateInput(values: TradeFormValues): CreateTradeInput {
  const { tradeTimestamp, ...rest } = values;
  const iso = fromDateTimeLocal(tradeTimestamp);
  return iso ? { ...rest, tradeTimestamp: iso } : rest;
}

export function formDefaults(
  trade?: TradeDto,
  user?: { traderCode: string; books: string[] },
): TradeFormInput {
  if (trade) {
    return {
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      trader: trade.trader,
      book: trade.book,
      counterparty: trade.counterparty,
      tradeTimestamp: toDateTimeLocal(trade.tradeTimestamp),
    };
  }
  return {
    symbol: '',
    side: 'BUY',
    quantity: undefined as unknown as number,
    price: undefined as unknown as number,
    trader: user?.traderCode ?? '',
    book: user?.books[0] ?? '',
    counterparty: '',
    tradeTimestamp: '',
  };
}

/** Only the fields that differ from the trade, for PATCH /trades/:id. */
export function diffChanges(trade: TradeDto, values: TradeFormValues): TradeChanges {
  const changes: TradeChanges = {};
  if (values.symbol !== trade.symbol) changes.symbol = values.symbol;
  if (values.side !== trade.side) changes.side = values.side;
  if (values.quantity !== trade.quantity) changes.quantity = values.quantity;
  if (values.price !== trade.price) changes.price = values.price;
  if (values.trader !== trade.trader) changes.trader = values.trader;
  if (values.book !== trade.book) changes.book = values.book;
  if (values.counterparty !== trade.counterparty) changes.counterparty = values.counterparty;
  const iso = fromDateTimeLocal(values.tradeTimestamp);
  // Compare to the second: the form shows no milliseconds.
  if (
    iso &&
    Math.floor(Date.parse(iso) / 1000) !== Math.floor(Date.parse(trade.tradeTimestamp) / 1000)
  ) {
    changes.tradeTimestamp = iso;
  }
  return changes;
}
