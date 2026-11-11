import type { ListTradesQuery, TradePage, TradeRecord } from '@blotter/contracts';
import type { Prisma } from '@blotter/database';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';
import type { TradeReadModel } from '../application/ports/trade-read-model.port.js';
import { rowToRecord } from './trade-row.mapper.js';

/** Server-side filtering, sorting and paging for the grid (decision 5). */
@Injectable()
export class PrismaTradeReadModel implements TradeReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTradesQuery): Promise<TradePage> {
    const where = toWhere(query);
    const orderBy: Prisma.TradeOrderByWithRelationInput[] = [
      { [query.sort.field]: query.sort.direction },
      // Stable tie-break so paging never repeats or skips rows.
      { tradeRef: query.sort.field === 'tradeRef' ? query.sort.direction : 'desc' },
    ];
    const [rows, total] = await Promise.all([
      this.prisma.db.trade.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.db.trade.count({ where }),
    ]);
    return { items: rows.map(rowToRecord), total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string): Promise<TradeRecord | null> {
    const row = await this.prisma.db.trade.findUnique({ where: { id } });
    return row ? rowToRecord(row) : null;
  }
}

export function toWhere(q: ListTradesQuery): Prisma.TradeWhereInput {
  const contains = (value: string | undefined) =>
    value ? { contains: value, mode: 'insensitive' as const } : undefined;
  return {
    status: q.status,
    side: q.side,
    symbol: contains(q.symbol),
    book: contains(q.book),
    trader: contains(q.trader),
    counterparty: contains(q.counterparty),
    tradeTimestamp:
      q.from || q.to
        ? { gte: q.from ? new Date(q.from) : undefined, lte: q.to ? new Date(q.to) : undefined }
        : undefined,
  };
}
