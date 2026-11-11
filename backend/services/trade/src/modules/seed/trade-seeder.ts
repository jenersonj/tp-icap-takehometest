import { randomUUID } from 'node:crypto';

import { generateTrades } from '@blotter/database';
import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';

import { SERVICE_CONFIG, type ServiceConfig } from '../../config/service.config.js';
import { CLOCK, type Clock } from '../../shared/domain/clock.js';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service.js';
import { SYSTEM_ACTOR_ID } from '../audit/infrastructure/prisma-audit.read-model.js';

/**
 * On first start, when the trades table is empty, inserts realistic random trades (with a
 * CREATED audit row each) and moves the trade-ref sequence past them.
 */
@Injectable()
export class TradeSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(TradeSeeder.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVICE_CONFIG) private readonly config: Pick<ServiceConfig, 'SEED_TRADE_COUNT'>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const seeded = await this.seed();
    if (seeded > 0) this.logger.log(`Seeded ${seeded} random trades`);
  }

  /** Returns the number of trades inserted (0 when trades already exist or seeding is off). */
  async seed(): Promise<number> {
    if (this.config.SEED_TRADE_COUNT === 0) return 0;
    return this.prisma.run(async () => {
      const db = this.prisma.db;
      // Serialise concurrent service replicas starting at the same time.
      await db.$executeRaw`SELECT pg_advisory_xact_lock(4242)`;
      if ((await db.trade.count()) > 0) return 0;

      const now = this.clock.now();
      const generated = generateTrades({ count: this.config.SEED_TRADE_COUNT, now });
      const trades = generated.map((t) => ({
        id: randomUUID(),
        ...t,
        createdAt: t.tradeTimestamp,
      }));
      await db.trade.createMany({ data: trades });
      await db.tradeAudit.createMany({
        data: trades.map((t) => ({
          tradeId: t.id,
          action: 'CREATED' as const,
          version: 1,
          after: {
            symbol: t.symbol,
            side: t.side,
            quantity: t.quantity,
            price: t.price,
            trader: t.trader,
            book: t.book,
            counterparty: t.counterparty,
            tradeTimestamp: t.tradeTimestamp.toISOString(),
            status: t.status,
          },
          changed: [],
          actorId: SYSTEM_ACTOR_ID,
          reason: t.status === 'CANCELLED' ? 'Seeded as cancelled' : null,
          at: t.tradeTimestamp,
        })),
      });
      const last = trades.length + 100000;
      await db.$executeRaw`SELECT setval('trade_ref_seq', ${last}::bigint, true)`;
      return trades.length;
    });
  }
}
