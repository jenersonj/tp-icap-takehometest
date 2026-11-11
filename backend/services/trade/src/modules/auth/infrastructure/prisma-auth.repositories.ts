import type { Role } from '@blotter/contracts';
import type { UserRow } from '@blotter/database';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service.js';
import type { StoredRefreshToken, StoredSocketTicket } from '../domain/auth-policy.js';
import type {
  NewUser,
  RefreshTokenRepository,
  SocketTicketRepository,
  UserRepository,
} from '../domain/auth.repositories.js';
import { User } from '../domain/user.js';

const toUser = (row: UserRow) => User.restore({ ...row, role: row.role as Role });

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<User | null> {
    const row = await this.prisma.db.user.findUnique({ where: { username } });
    return row ? toUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.db.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  count(): Promise<number> {
    return this.prisma.db.user.count();
  }

  async insertMany(users: readonly NewUser[]): Promise<number> {
    const { count } = await this.prisma.db.user.createMany({
      data: [...users],
      skipDuplicates: true,
    });
    return count;
  }
}

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async insert(token: Omit<StoredRefreshToken, 'id' | 'revokedAt'>): Promise<void> {
    await this.prisma.db.refreshToken.create({ data: token });
  }

  findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    return this.prisma.db.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revoke(id: string, now: Date): Promise<boolean> {
    const { count } = await this.prisma.db.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: now },
    });
    return count === 1;
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.prisma.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}

@Injectable()
export class PrismaSocketTicketRepository implements SocketTicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async insert(ticket: Omit<StoredSocketTicket, 'usedAt'>): Promise<void> {
    await this.prisma.db.socketTicket.create({ data: ticket });
  }

  async redeem(id: string, now: Date): Promise<StoredSocketTicket | null> {
    // One conditional UPDATE: only the first redeemer of an unexpired ticket gets count 1.
    const { count } = await this.prisma.db.socketTicket.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (count !== 1) return null;
    return this.prisma.db.socketTicket.findUnique({ where: { id } });
  }
}
