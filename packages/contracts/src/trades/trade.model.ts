import { z } from 'zod';

export const Side = { BUY: 'BUY', SELL: 'SELL' } as const;
export type Side = (typeof Side)[keyof typeof Side];
export const SideSchema = z.enum([Side.BUY, Side.SELL]);

export const TradeStatus = { ACTIVE: 'ACTIVE', CANCELLED: 'CANCELLED' } as const;
export type TradeStatus = (typeof TradeStatus)[keyof typeof TradeStatus];
export const TradeStatusSchema = z.enum([TradeStatus.ACTIVE, TradeStatus.CANCELLED]);

/** Business fields a user may set on create and change on amend (decision 7). */
export const AMENDABLE_TRADE_FIELDS = [
  'symbol',
  'side',
  'quantity',
  'price',
  'trader',
  'book',
  'counterparty',
  'tradeTimestamp',
] as const;
export type AmendableTradeField = (typeof AMENDABLE_TRADE_FIELDS)[number];

/** Fields the trade list can be sorted by. */
export const TRADE_SORT_FIELDS = [
  'tradeRef',
  'symbol',
  'side',
  'quantity',
  'price',
  'trader',
  'book',
  'counterparty',
  'tradeTimestamp',
  'status',
  'updatedAt',
] as const;
export type TradeSortField = (typeof TRADE_SORT_FIELDS)[number];
