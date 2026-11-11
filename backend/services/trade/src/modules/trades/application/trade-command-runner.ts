import { Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';

import { UNIT_OF_WORK, type UnitOfWork } from '../../../shared/application/unit-of-work.js';
import type { Trade } from '../domain/trade.js';
import { TRADE_AUDIT_LOG, type TradeAuditLog } from './ports/trade-audit-log.port.js';

/**
 * The shared tail of every trade command: persist and audit in one transaction, then
 * publish the domain events only after the commit (decision 2: no outbox).
 */
@Injectable()
export class TradeCommandRunner {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(TRADE_AUDIT_LOG) private readonly audit: TradeAuditLog,
    private readonly eventBus: EventBus,
  ) {}

  async commit(trade: Trade, persist: () => Promise<void>): Promise<void> {
    const events = trade.pullEvents();
    await this.uow.run(async () => {
      await persist();
      for (const event of events) await this.audit.record(event);
    });
    this.eventBus.publishAll(events);
  }
}
