import type { Actor } from '@blotter/contracts';

import type {
  AccessTokenSigner,
  VerifiedAccessToken,
} from '../src/modules/auth/application/ports/access-token-signer.port.js';
import type { PasswordHasher } from '../src/modules/auth/application/ports/password-hasher.port.js';
import type {
  StoredRefreshToken,
  StoredSocketTicket,
} from '../src/modules/auth/domain/auth-policy.js';
import type {
  NewUser,
  RefreshTokenRepository,
  SocketTicketRepository,
  UserRepository,
} from '../src/modules/auth/domain/auth.repositories.js';
import { User } from '../src/modules/auth/domain/user.js';

/** "hashes" by prefixing, so tests can see what was hashed. */
export const fakeHasher: PasswordHasher = {
  hash: (password) => Promise.resolve(`hashed:${password}`),
  verify: (password, hash) => Promise.resolve(hash === `hashed:${password}`),
};

/** Encodes the actor as JSON; "verifies" by checking the expiry against `now`. */
export class FakeSigner implements AccessTokenSigner {
  sign(actor: Actor, _issuedAt: Date, expiresAt: Date): Promise<string> {
    return Promise.resolve(`jwt.${JSON.stringify({ actor, exp: expiresAt.toISOString() })}`);
  }

  verify(token: string, now: Date): Promise<VerifiedAccessToken | null> {
    if (!token.startsWith('jwt.')) return Promise.resolve(null);
    const { actor, exp } = JSON.parse(token.slice(4)) as { actor: Actor; exp: string };
    const expiresAt = new Date(exp);
    return Promise.resolve(expiresAt > now ? { actor, expiresAt } : null);
  }
}

export class InMemoryUsers implements UserRepository {
  readonly rows: User[] = [];

  add(state: Omit<Parameters<typeof User.restore>[0], 'passwordHash'> & { password: string }) {
    const { password, ...rest } = state;
    const user = User.restore({ ...rest, passwordHash: `hashed:${password}` });
    this.rows.push(user);
    return user;
  }

  findByUsername(username: string): Promise<User | null> {
    return Promise.resolve(this.rows.find((u) => u.toSessionUser().username === username) ?? null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.rows.find((u) => u.id === id) ?? null);
  }

  count(): Promise<number> {
    return Promise.resolve(this.rows.length);
  }

  insertMany(users: readonly NewUser[]): Promise<number> {
    for (const [i, u] of users.entries()) {
      this.rows.push(User.restore({ ...u, id: `seeded-${i}` }));
    }
    return Promise.resolve(users.length);
  }
}

export class InMemoryRefreshTokens implements RefreshTokenRepository {
  readonly rows: StoredRefreshToken[] = [];

  insert(token: Omit<StoredRefreshToken, 'id' | 'revokedAt'>): Promise<void> {
    this.rows.push({ ...token, id: `rt-${this.rows.length + 1}`, revokedAt: null });
    return Promise.resolve();
  }

  findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    return Promise.resolve(this.rows.find((t) => t.tokenHash === tokenHash) ?? null);
  }

  revoke(id: string, now: Date): Promise<boolean> {
    const row = this.rows.find((t) => t.id === id && !t.revokedAt);
    if (row) row.revokedAt = now;
    return Promise.resolve(Boolean(row));
  }

  revokeAllForUser(userId: string, now: Date): Promise<void> {
    for (const t of this.rows) if (t.userId === userId && !t.revokedAt) t.revokedAt = now;
    return Promise.resolve();
  }
}

export class InMemorySocketTickets implements SocketTicketRepository {
  readonly rows: StoredSocketTicket[] = [];

  insert(ticket: Omit<StoredSocketTicket, 'usedAt'>): Promise<void> {
    this.rows.push({ ...ticket, usedAt: null });
    return Promise.resolve();
  }

  redeem(id: string, now: Date): Promise<StoredSocketTicket | null> {
    const row = this.rows.find((t) => t.id === id && !t.usedAt && t.expiresAt > now);
    if (row) row.usedAt = now;
    return Promise.resolve(row ? { ...row } : null);
  }
}
