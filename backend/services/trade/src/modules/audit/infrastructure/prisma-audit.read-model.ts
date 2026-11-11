import type { AuditEntryRecord, TradeSnapshot } from '@blotter/contracts';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';
import type { AuditReadModel } from '../application/list-audit-for-trade.query.js';

export const SYSTEM_ACTOR_ID = 'system';

@Injectable()
export class PrismaAuditReadModel implements AuditReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async listForTrade(tradeId: string): Promise<AuditEntryRecord[] | null> {
    const trade = await this.prisma.db.trade.findUnique({
      where: { id: tradeId },
      select: { id: true },
    });
    if (!trade) return null;
    const rows = await this.prisma.db.tradeAudit.findMany({
      where: { tradeId },
      orderBy: [{ at: 'asc' }, { version: 'asc' }],
    });
    const userIds = [
      ...new Set(rows.map((r) => r.actorId).filter((id) => id !== SYSTEM_ACTOR_ID && isUuid(id))),
    ];
    const users = userIds.length
      ? await this.prisma.db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, traderCode: true },
        })
      : [];
    const names = new Map(users.map((u) => [u.id, u.traderCode]));
    return rows.map((r) => ({
      id: r.id,
      tradeId: r.tradeId,
      action: r.action,
      version: r.version,
      before: (r.before as TradeSnapshot | null) ?? null,
      after: r.after as TradeSnapshot,
      changed: r.changed,
      actorId: r.actorId,
      actorName: r.actorId === SYSTEM_ACTOR_ID ? 'SYSTEM' : (names.get(r.actorId) ?? r.actorId),
      reason: r.reason,
      at: r.at.toISOString(),
    }));
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
