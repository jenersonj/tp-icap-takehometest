import { AsyncLocalStorage } from 'node:async_hooks';

import { createPrismaClient, type Prisma, type PrismaClient } from '@blotter/database';
import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import type { UnitOfWork } from '../../application/unit-of-work.js';
import { SERVICE_CONFIG, type ServiceConfig } from '../../../config/service.config.js';

export type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Owns the Prisma client and implements the UnitOfWork: inside `run`, `db` returns the
 * transaction client (carried in AsyncLocalStorage), so every repository joins the same
 * transaction without passing it around.
 */
@Injectable()
export class PrismaService implements UnitOfWork, OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;
  private readonly tx = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(@Inject(SERVICE_CONFIG) config: Pick<ServiceConfig, 'DATABASE_URL'>) {
    this.client = createPrismaClient(config.DATABASE_URL);
  }

  /** The current transaction's client, or the root client outside a transaction. */
  get db(): Db {
    return this.tx.getStore() ?? this.client;
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.tx.getStore()) return work(); // already inside a transaction: join it
    return this.client.$transaction((tx) => this.tx.run(tx, work));
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
