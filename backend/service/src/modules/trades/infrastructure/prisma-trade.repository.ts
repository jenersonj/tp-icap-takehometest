import { randomUUID } from 'node:crypto';

import { formatTradeRef } from '@blotter/database';
import { Injectable } from '@nestjs/common';

import { DomainError } from '../../../shared/domain/domain-error.js';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';
import type { Trade } from '../domain/trade.js';
import type { TradeRepository } from '../domain/trade.repository.js';
import { rowToTrade } from './trade-row.mapper.js';

@Injectable()
export class PrismaTradeRepository implements TradeRepository {
  constructor(private readonly prisma: PrismaService) {}

  newId(): string {
    return randomUUID();
  }

  async nextTradeRef(): Promise<string> {
    const [row] = await this.prisma.db.$queryRaw<
      { n: bigint }[]
    >`SELECT nextval('trade_ref_seq') AS n`;
    return formatTradeRef(Number(row!.n));
  }

  async findById(id: string): Promise<Trade | null> {
    const row = await this.prisma.db.trade.findUnique({ where: { id } });
    return row ? rowToTrade(row) : null;
  }

  async insert(trade: Trade): Promise<void> {
    const s = trade.toState();
    await this.prisma.db.trade.create({
      data: {
        id: s.id,
        tradeRef: s.tradeRef,
        symbol: s.symbol,
        side: s.side,
        quantity: s.quantity,
        price: s.price.value,
        trader: s.trader,
        book: s.book,
        counterparty: s.counterparty,
        tradeTimestamp: s.tradeTimestamp,
        status: s.status,
        version: s.version,
        createdAt: s.createdAt,
        createdById: s.createdById,
      },
    });
  }

  async update(trade: Trade, expectedVersion: number): Promise<void> {
    const s = trade.toState();
    // Compare-and-set on version: a concurrent writer that committed first makes this a no-op.
    const { count } = await this.prisma.db.trade.updateMany({
      where: { id: s.id, version: expectedVersion },
      data: {
        symbol: s.symbol,
        side: s.side,
        quantity: s.quantity,
        price: s.price.value,
        trader: s.trader,
        book: s.book,
        counterparty: s.counterparty,
        tradeTimestamp: s.tradeTimestamp,
        status: s.status,
        version: s.version,
      },
    });
    if (count === 1) return;
    const current = await this.prisma.db.trade.findUnique({
      where: { id: s.id },
      select: { version: true },
    });
    if (!current) throw DomainError.notFound('Trade', s.id);
    throw DomainError.versionConflict(expectedVersion, current.version);
  }
}
