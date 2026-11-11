import {
  BOOKS,
  COUNTERPARTIES,
  SYMBOL_REFERENCE_PRICES,
  SYMBOLS,
  TRADER_CODES,
  type Side,
  type TradeStatus,
} from '@blotter/contracts';

import { createRandom, intBetween, pick, type Random } from './random.js';

export interface SeedTrade {
  tradeRef: string;
  symbol: string;
  side: Side;
  quantity: number;
  /** Decimal string, 2 dp (4 dp for prices under 10, e.g. pence-quoted LSE names). */
  price: string;
  trader: string;
  book: string;
  counterparty: string;
  tradeTimestamp: Date;
  status: TradeStatus;
}

export interface GenerateTradesOptions {
  /** 100 to 1,000 per the brief. Default 500. */
  count?: number;
  /** PRNG seed; the same seed gives the same trades. */
  seed?: number;
  /** Trades fall on the business days up to and including this date. */
  now?: Date;
  /** Number of business days to spread trades over. Default 5. */
  businessDays?: number;
  /** Share of trades generated as CANCELLED. Default 0.08. */
  cancelledRatio?: number;
  /** First trade reference number. Default 100001 (TRD-100001). */
  firstRef?: number;
}

const US_SYMBOLS = SYMBOLS.filter((s) => !s.endsWith('.L'));
const UK_SYMBOLS = SYMBOLS.filter((s) => s.endsWith('.L'));
const TECH = ['AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'NVDA', 'NFLX', 'ORCL'];
const FINANCIALS = ['JPM', 'GS', 'BAC', 'BARC.L', 'HSBA.L'];

/** Keep symbols and books plausible together (UK book trades London lines, and so on). */
function symbolForBook(random: Random, book: string): string {
  switch (book) {
    case 'EQUITIES_UK':
      return pick(random, UK_SYMBOLS);
    case 'EQUITIES_US':
      return pick(random, US_SYMBOLS);
    case 'TECH_GROWTH':
      return pick(random, TECH);
    case 'FINANCIALS':
      return pick(random, FINANCIALS);
    default:
      return pick(random, SYMBOLS);
  }
}

function priceNear(random: Random, reference: number): string {
  const drift = 1 + (random() - 0.5) * 0.06; // within +/-3%
  const decimals = reference < 10 ? 4 : 2;
  return (reference * drift).toFixed(decimals);
}

function quantity(random: Random, price: number): number {
  // Smaller lots for expensive names, round lots of 100 for most, odd lots occasionally.
  const notionalTarget = intBetween(random, 20, 2_000) * 1_000;
  const raw = Math.max(1, notionalTarget / price);
  const lot = random() < 0.9 ? 100 : 1;
  return Math.max(lot, Math.round(raw / lot) * lot);
}

function businessDaysBack(now: Date, count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  while (days.length < count) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return days.reverse();
}

/**
 * Generates realistic random equity trades in the shape of the brief's sample, ordered
 * by time with sequential references (TRD-100001, TRD-100002, ...).
 */
export function generateTrades(options: GenerateTradesOptions = {}): SeedTrade[] {
  const {
    count = 500,
    seed = 20260818,
    now = new Date(),
    businessDays = 5,
    cancelledRatio = 0.08,
    firstRef = 100001,
  } = options;
  if (!Number.isInteger(count) || count < 1) throw new Error('count must be a positive integer');

  const random = createRandom(seed);
  const days = businessDaysBack(now, businessDays);
  const sessionStartSec = 8 * 3600; // 08:00 UTC
  const sessionEndSec = 16 * 3600 + 30 * 60; // 16:30 UTC

  const trades = Array.from({ length: count }, () => {
    const day = pick(random, days);
    const tradeTimestamp = new Date(
      day.getTime() + intBetween(random, sessionStartSec, sessionEndSec) * 1000,
    );
    const book = pick(random, BOOKS);
    const symbol = symbolForBook(random, book);
    const reference = SYMBOL_REFERENCE_PRICES[symbol as keyof typeof SYMBOL_REFERENCE_PRICES];
    const price = priceNear(random, reference);
    return {
      symbol,
      side: (random() < 0.5 ? 'BUY' : 'SELL') as Side,
      quantity: quantity(random, Number(price)),
      price,
      trader: pick(random, TRADER_CODES),
      book,
      counterparty: pick(random, COUNTERPARTIES),
      tradeTimestamp:
        tradeTimestamp > now
          ? new Date(now.getTime() - intBetween(random, 1, 3600) * 1000)
          : tradeTimestamp,
      status: (random() < cancelledRatio ? 'CANCELLED' : 'ACTIVE') as TradeStatus,
    };
  });

  trades.sort((a, b) => a.tradeTimestamp.getTime() - b.tradeTimestamp.getTime());
  return trades.map((t, i) => ({ tradeRef: formatTradeRef(firstRef + i), ...t }));
}

export function formatTradeRef(n: number): string {
  return `TRD-${String(n).padStart(6, '0')}`;
}
