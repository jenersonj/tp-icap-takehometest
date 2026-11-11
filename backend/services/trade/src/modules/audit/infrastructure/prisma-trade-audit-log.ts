import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';
import type { TradeAuditLog } from '../../trades/application/ports/trade-audit-log.port.js';
import type { TradeEvent } from '../../trades/domain/trade.events.js';

const ACTION = {
  TradeCreated: 'CREATED',
  TradeAmended: 'AMENDED',
  TradeCancelled: 'CANCELLED',
} as const;

/** Appends one immutable audit row per trade event, inside the command's transaction. */
@Injectable()
export class PrismaTradeAuditLog implements TradeAuditLog {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: TradeEvent): Promise<void> {
    await this.prisma.db.tradeAudit.create({
      data: {
        tradeId: event.tradeId,
        action: ACTION[event.type],
        version: event.version,
        before: event.type === 'TradeCreated' ? undefined : { ...event.before },
        after: { ...event.after },
        changed:
          event.type === 'TradeAmended'
            ? event.changed
            : event.type === 'TradeCancelled'
              ? ['status']
              : [],
        actorId: event.actorId,
        reason: event.type === 'TradeCancelled' ? (event.reason ?? null) : null,
        at: event.occurredAt,
      },
    });
  }
}
