import type { IsoDateTime } from '../common/primitives.js';
import type { AuditAction } from './audit.model.js';

/** Business-field snapshot stored in the audit row (price as a decimal string). */
export type TradeSnapshot = Record<string, string | number | null>;

export interface AuditEntryRecord {
  id: string;
  tradeId: string;
  action: AuditAction;
  /** Trade version after the change. */
  version: number;
  before: TradeSnapshot | null;
  after: TradeSnapshot;
  /** Names of the fields that changed. */
  changed: string[];
  actorId: string;
  /** Resolved by the service for display (trader code or username). */
  actorName: string;
  reason: string | null;
  at: IsoDateTime;
}
