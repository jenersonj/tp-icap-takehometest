import type { Role } from '@blotter/contracts';

import type { StoredRefreshToken, StoredSocketTicket } from './auth-policy.js';
import type { User } from './user.js';

export interface NewUser {
  username: string;
  passwordHash: string;
  traderCode: string;
  role: Role;
  books: string[];
}

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  count(): Promise<number>;
  /** Skips usernames that already exist; returns how many were inserted. */
  insertMany(users: readonly NewUser[]): Promise<number>;
}

export interface RefreshTokenRepository {
  insert(token: Omit<StoredRefreshToken, 'id' | 'revokedAt'>): Promise<void>;
  findByHash(tokenHash: string): Promise<StoredRefreshToken | null>;
  /** Revokes the token if it is still active; false when it was already revoked. */
  revoke(id: string, now: Date): Promise<boolean>;
  revokeAllForUser(userId: string, now: Date): Promise<void>;
}

export interface SocketTicketRepository {
  insert(ticket: Omit<StoredSocketTicket, 'usedAt'>): Promise<void>;
  /**
   * Marks the ticket used if it exists, is unused and has not expired, in one atomic step,
   * so a ticket can be redeemed once only. Null otherwise.
   */
  redeem(id: string, now: Date): Promise<StoredSocketTicket | null>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
export const SOCKET_TICKET_REPOSITORY = Symbol('SOCKET_TICKET_REPOSITORY');
