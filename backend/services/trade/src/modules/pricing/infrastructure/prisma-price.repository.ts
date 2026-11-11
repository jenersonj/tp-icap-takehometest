import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';
import type { MarketPrice } from '../domain/market-price.js';
import type { PriceRepository } from '../domain/price.repository.js';

@Injectable()
export class PrismaPriceRepository implements PriceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadAll(): Promise<MarketPrice[]> {
    const rows = await this.prisma.db.price.findMany();
    return rows.map((r) => ({ symbol: r.symbol, price: Number(r.price), asOf: r.asOf }));
  }

  async saveAll(prices: readonly MarketPrice[]): Promise<void> {
    await this.prisma.run(async () => {
      for (const p of prices) {
        const data = { price: String(p.price), asOf: p.asOf };
        await this.prisma.db.price.upsert({
          where: { symbol: p.symbol },
          create: { symbol: p.symbol, ...data },
          update: data,
        });
      }
    });
  }

  async insertMissing(prices: readonly MarketPrice[]): Promise<number> {
    const { count } = await this.prisma.db.price.createMany({
      data: prices.map((p) => ({ symbol: p.symbol, price: String(p.price), asOf: p.asOf })),
      skipDuplicates: true,
    });
    return count;
  }
}
