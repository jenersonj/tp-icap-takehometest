import type { PriceRecord } from '@blotter/contracts';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';
import type { PriceReadModel } from '../application/ports/price-read-model.port.js';

@Injectable()
export class PrismaPriceReadModel implements PriceReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(symbols?: readonly string[]): Promise<PriceRecord[]> {
    const rows = await this.prisma.db.price.findMany({
      where: symbols ? { symbol: { in: [...symbols] } } : undefined,
      orderBy: { symbol: 'asc' },
    });
    return rows.map((r) => ({
      symbol: r.symbol,
      price: r.price.toString(),
      asOf: r.asOf.toISOString(),
    }));
  }
}
