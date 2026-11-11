import { ActorSchema, type Actor } from '@blotter/contracts';
import { jwtVerify, SignJWT } from 'jose';

import type {
  AccessTokenSigner,
  VerifiedAccessToken,
} from '../application/ports/access-token-signer.port.js';

const ISSUER = 'blotter-service';
const AUDIENCE = 'blotter-api';
const toSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** HS256 JWT carrying the Actor, so a verified token is all a command needs. */
export class JoseAccessTokenSigner implements AccessTokenSigner {
  private readonly key: Uint8Array;

  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret);
  }

  sign(actor: Actor, issuedAt: Date, expiresAt: Date): Promise<string> {
    const { userId, ...claims } = actor;
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(toSeconds(issuedAt))
      .setExpirationTime(toSeconds(expiresAt))
      .sign(this.key);
  }

  async verify(token: string, now: Date): Promise<VerifiedAccessToken | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: AUDIENCE,
        currentDate: now,
      });
      const actor = ActorSchema.safeParse({ ...payload, userId: payload.sub });
      if (!actor.success || payload.exp === undefined) return null;
      return { actor: actor.data, expiresAt: new Date(payload.exp * 1000) };
    } catch {
      return null;
    }
  }
}
