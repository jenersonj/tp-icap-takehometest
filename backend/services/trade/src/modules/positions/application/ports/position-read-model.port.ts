import type { PositionTotals } from '../../domain/position.js';

/** Per-symbol totals over ACTIVE trades, computed on request (decision 6). */
export interface PositionReadModel {
  totalsBySymbol(book?: string): Promise<PositionTotals[]>;
}

export const POSITION_READ_MODEL = Symbol('POSITION_READ_MODEL');
