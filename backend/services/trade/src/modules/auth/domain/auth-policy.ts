import { ALL_REALTIME_GROUPS, type RealtimeGroup, type Role } from '@blotter/contracts';

/** A socket ticket must be redeemed within this time of being issued. */
export const SOCKET_TICKET_TTL_MS = 30_000;

/**
 * Realtime groups a role may join. Events carry ids only and every role can read every
 * screen, so TRADER and VIEWER both get all groups; writes are guarded by the trade rules.
 */
export function allowedGroupsFor(_role: Role): RealtimeGroup[] {
  return [...ALL_REALTIME_GROUPS];
}

export interface StoredRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export type RefreshTokenState = 'active' | 'expired' | 'revoked';

/** A revoked token presented again means it was replayed (see RefreshSessionHandler). */
export function refreshTokenState(token: StoredRefreshToken, now: Date): RefreshTokenState {
  if (token.revokedAt) return 'revoked';
  return token.expiresAt.getTime() > now.getTime() ? 'active' : 'expired';
}

export interface StoredSocketTicket {
  /** SHA-256 of the raw ticket. */
  id: string;
  userId: string;
  allowedGroups: string[];
  expiresAt: Date;
  sessionExpiresAt: Date;
  usedAt: Date | null;
}
