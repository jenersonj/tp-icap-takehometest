import type { IsoDateTime } from '../common/primitives.js';
import type { AuditAction } from './audit.model.js';

export interface AuditChangeDto {
  field: string;
  from: string | number | null;
  to: string | number | null;
}

/** An audit trail entry as the web shows it: one row per change, with a field-level diff. */
export interface AuditEntryDto {
  id: string;
  action: AuditAction;
  version: number;
  actor: string;
  reason: string | null;
  at: IsoDateTime;
  changes: AuditChangeDto[];
}
