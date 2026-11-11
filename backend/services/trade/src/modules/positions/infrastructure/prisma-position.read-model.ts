import { Prisma } from '@blotter/database';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';
import type { PositionReadModel } from '../application/ports/position-read-model.port.js';
import type { PositionTotals } from '../domain/position.js';

interface TotalsRow {
  symbol: string;
  buyQuantity: string;
  buyNotional: string;
  sellQuantity: string;
  sellNotional: string;
  tradeCount: number;
}

/** One GROUP BY over ACTIVE trades; sums come back as text to keep Decimal precision. */
@Injectable()
export class PrismaPositionReadModel implements PositionReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async totalsBySymbol(book?: string): Promise<PositionTotals[]> {
    const byBook = book ? Prisma.sql`AND book = ${book}` : Prisma.empty;
    const rows = await this.prisma.db.$queryRaw<TotalsRow[]>`
      SELECT symbol,
        COALESCE(SUM(quantity) FILTER (WHERE side = 'BUY'), 0)::text AS "buyQuantity",
        COALESCE(SUM(quantity * price) FILTER (WHERE side = 'BUY'), 0)::text AS "buyNotional",
        COALESCE(SUM(quantity) FILTER (WHERE side = 'SELL'), 0)::text AS "sellQuantity",
        COALESCE(SUM(quantity * price) FILTER (WHERE side = 'SELL'), 0)::text AS "sellNotional",
        COUNT(*)::int AS "tradeCount"
      FROM trades
      WHERE status = 'ACTIVE' ${byBook}
      GROUP BY symbol
      ORDER BY symbol`;
    return rows.map((r) => ({
      symbol: r.symbol,
      buyQuantity: Number(r.buyQuantity),
      buyNotional: Number(r.buyNotional),
      sellQuantity: Number(r.sellQuantity),
      sellNotional: Number(r.sellNotional),
      tradeCount: r.tradeCount,
    }));
  }
}
