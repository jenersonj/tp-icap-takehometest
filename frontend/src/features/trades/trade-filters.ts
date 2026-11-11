import type { Side, TradeStatus } from '@blotter/contracts';

/** Toolbar filters, sent as GET /trades query parameters. */
export interface TradeFilters {
  status?: TradeStatus;
  side?: Side;
  book?: string;
  symbol?: string;
  trader?: string;
  counterparty?: string;
}

export const EMPTY_FILTERS: TradeFilters = { status: 'ACTIVE' };

export function activeFilterCount(filters: TradeFilters): number {
  return Object.values(filters).filter((v) => v !== undefined && v !== '').length;
}
