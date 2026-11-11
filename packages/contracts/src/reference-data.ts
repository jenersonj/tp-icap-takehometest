/**
 * Reference data, kept as constants for now (see ARCHITECTURE.md, "Reference data").
 * Used for validation in the service, seeding, and pick-lists in the web forms.
 */

/** Symbol -> reference price used to seed trades and start the mock price ticker. */
export const SYMBOL_REFERENCE_PRICES = {
  AAPL: 227.45,
  MSFT: 534.22,
  TSLA: 341.75,
  AMZN: 231.1,
  GOOGL: 205.6,
  META: 742.3,
  NVDA: 182.4,
  JPM: 298.15,
  GS: 742.8,
  BAC: 51.2,
  NFLX: 1210.5,
  ORCL: 245.9,
  'VOD.L': 0.7342,
  'BARC.L': 3.215,
  'HSBA.L': 9.874,
  'BP.L': 4.412,
} as const satisfies Record<string, number>;

export type TradeSymbol = keyof typeof SYMBOL_REFERENCE_PRICES;
export const SYMBOLS = Object.keys(SYMBOL_REFERENCE_PRICES) as TradeSymbol[];

export const BOOKS = [
  'EQUITIES_UK',
  'EQUITIES_US',
  'TECH_GROWTH',
  'FINANCIALS',
  'MACRO_HEDGE',
] as const;
export type Book = (typeof BOOKS)[number];

export const COUNTERPARTIES = [
  'Goldman Sachs',
  'JP Morgan',
  'Morgan Stanley',
  'Barclays',
  'HSBC',
  'Citi',
  'UBS',
  'Deutsche Bank',
  'BNP Paribas',
  'Bank of America',
] as const;
export type Counterparty = (typeof COUNTERPARTIES)[number];

/** Trader codes used by the seed data and seeded users. */
export const TRADER_CODES = ['JSMITH', 'ABROWN', 'MJONES', 'KPATEL', 'LCHEN', 'RGARCIA'] as const;
export type TraderCode = (typeof TRADER_CODES)[number];

export function isKnownSymbol(value: string): value is TradeSymbol {
  return Object.prototype.hasOwnProperty.call(SYMBOL_REFERENCE_PRICES, value);
}

export function isKnownBook(value: string): value is Book {
  return (BOOKS as readonly string[]).includes(value);
}

export function isKnownCounterparty(value: string): value is Counterparty {
  return (COUNTERPARTIES as readonly string[]).includes(value);
}
