import { describe, expect, it } from 'vitest';

import { allowedGroupsFor, refreshTokenState, type StoredRefreshToken } from './auth-policy.js';
import { hashToken, newOpaqueToken } from './opaque-token.js';
import { normaliseUsername, User } from './user.js';

const user = User.restore({
  id: 'u-1',
  username: 'jsmith',
  passwordHash: 'secret-hash',
  traderCode: 'JSMITH',
  role: 'TRADER',
  books: ['EQUITIES_US'],
});

describe('User', () => {
  it('exposes a session user and an actor without the password hash', () => {
    expect(user.toSessionUser()).toEqual({
      id: 'u-1',
      username: 'jsmith',
      traderCode: 'JSMITH',
      role: 'TRADER',
      books: ['EQUITIES_US'],
    });
    expect(user.toActor()).toEqual({
      userId: 'u-1',
      username: 'jsmith',
      traderCode: 'JSMITH',
      role: 'TRADER',
      books: ['EQUITIES_US'],
    });
    expect(JSON.stringify(user.toSessionUser())).not.toContain('secret-hash');
  });

  it('normalises usernames', () => {
    expect(normaliseUsername('  JSmith ')).toBe('jsmith');
  });
});

describe('auth policy', () => {
  it('lets both roles join every realtime group', () => {
    expect(allowedGroupsFor('TRADER')).toEqual(['trades', 'positions', 'prices']);
    expect(allowedGroupsFor('VIEWER')).toEqual(['trades', 'positions', 'prices']);
  });

  it('classifies refresh tokens', () => {
    const now = new Date('2026-11-11T10:00:00Z');
    const token: StoredRefreshToken = {
      id: 'r',
      userId: 'u',
      tokenHash: 'h',
      expiresAt: new Date(now.getTime() + 1000),
      revokedAt: null,
    };
    expect(refreshTokenState(token, now)).toBe('active');
    expect(refreshTokenState({ ...token, expiresAt: now }, now)).toBe('expired');
    expect(refreshTokenState({ ...token, revokedAt: now }, now)).toBe('revoked');
  });
});

describe('opaque tokens', () => {
  it('are random 256-bit values, stored as a stable SHA-256', () => {
    const a = newOpaqueToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newOpaqueToken()).not.toBe(a);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
  });
});
