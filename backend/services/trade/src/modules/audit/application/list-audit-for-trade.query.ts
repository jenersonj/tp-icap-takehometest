import type { AuditEntryRecord } from '@blotter/contracts';
import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { DomainError } from '../../../shared/domain/domain-error.js';

export interface AuditReadModel {
  /** Null when the trade does not exist; an empty list cannot happen for an existing trade. */
  listForTrade(tradeId: string): Promise<AuditEntryRecord[] | null>;
}

export const AUDIT_READ_MODEL = Symbol('AUDIT_READ_MODEL');

export class ListAuditForTradeQuery {
  constructor(readonly tradeId: string) {}
}

@QueryHandler(ListAuditForTradeQuery)
export class ListAuditForTradeHandler implements IQueryHandler<
  ListAuditForTradeQuery,
  AuditEntryRecord[]
> {
  constructor(@Inject(AUDIT_READ_MODEL) private readonly readModel: AuditReadModel) {}

  async execute({ tradeId }: ListAuditForTradeQuery): Promise<AuditEntryRecord[]> {
    const entries = await this.readModel.listForTrade(tradeId);
    if (!entries) throw DomainError.notFound('Trade', tradeId);
    return entries;
  }
}
