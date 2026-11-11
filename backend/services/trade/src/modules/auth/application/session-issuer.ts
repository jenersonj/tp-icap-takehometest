import type { AuthTokensRecord } from '@blotter/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { SERVICE_CONFIG, type ServiceConfig } from '../../../config/service.config.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../domain/auth.repositories.js';
import { hashToken, newOpaqueToken } from '../domain/opaque-token.js';
import type { User } from '../domain/user.js';
import { ACCESS_TOKEN_SIGNER, type AccessTokenSigner } from './ports/access-token-signer.port.js';

export type SessionTtls = Pick<
  ServiceConfig,
  'ACCESS_TOKEN_TTL_SECONDS' | 'REFRESH_TOKEN_TTL_SECONDS'
>;

/** Shared by login and refresh: a new access token and a new (stored hashed) refresh token. */
@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(ACCESS_TOKEN_SIGNER) private readonly signer: AccessTokenSigner,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(SERVICE_CONFIG) private readonly ttls: SessionTtls,
  ) {}

  async issue(user: User, now: Date): Promise<AuthTokensRecord> {
    const accessExpiresAt = new Date(now.getTime() + this.ttls.ACCESS_TOKEN_TTL_SECONDS * 1000);
    const refreshExpiresAt = new Date(now.getTime() + this.ttls.REFRESH_TOKEN_TTL_SECONDS * 1000);
    const accessToken = await this.signer.sign(user.toActor(), now, accessExpiresAt);
    const refreshToken = newOpaqueToken();
    await this.refreshTokens.insert({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiresAt,
    });
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessExpiresAt.toISOString(),
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
      user: user.toSessionUser(),
    };
  }
}
