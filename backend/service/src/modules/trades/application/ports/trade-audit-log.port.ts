import type { TradeEvent } from '../../domain/trade.events.js';

/**
 * Outbound port to the audit module. Called inside the command's transaction so the audit
 * row commits with the trade change (ARCHITECTURE.md: "tx: insert trade + audit row").
 */
export interface TradeAuditLog {
  record(event: TradeEvent): Promise<void>;
}

export const TRADE_AUDIT_LOG = Symbol('TRADE_AUDIT_LOG');
