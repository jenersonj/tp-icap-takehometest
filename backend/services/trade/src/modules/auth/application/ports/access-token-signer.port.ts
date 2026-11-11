import type { Actor } from '@blotter/contracts';

export interface VerifiedAccessToken {
  actor: Actor;
  expiresAt: Date;
}

/** Signs and checks the short-lived access token (a JWT the API keeps in a cookie). */
export interface AccessTokenSigner {
  sign(actor: Actor, issuedAt: Date, expiresAt: Date): Promise<string>;
  /** Null for a bad signature, a malformed token or one that has expired at `now`. */
  verify(token: string, now: Date): Promise<VerifiedAccessToken | null>;
}

export const ACCESS_TOKEN_SIGNER = Symbol('ACCESS_TOKEN_SIGNER');
