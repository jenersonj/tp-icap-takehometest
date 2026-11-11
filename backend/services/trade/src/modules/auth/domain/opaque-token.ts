import { createHash, randomBytes } from 'node:crypto';

/**
 * Refresh tokens and socket tickets are random 256-bit values. Only their SHA-256 is
 * stored, so a database leak does not hand out live tokens; a fast hash is enough
 * because the input has full entropy (unlike a password).
 */
export function newOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
