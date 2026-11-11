import type { VerifiedAccessTokenRecord } from '@blotter/contracts';
import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { CLOCK, type Clock } from '../../../../shared/domain/clock.js';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import { ACCESS_TOKEN_SIGNER, type AccessTokenSigner } from '../ports/access-token-signer.port.js';

export class VerifyAccessTokenQuery {
  constructor(readonly accessToken: string) {}
}

/** The API's check of the access-token cookie: the Actor it carries, or UNAUTHENTICATED. */
@QueryHandler(VerifyAccessTokenQuery)
export class VerifyAccessTokenHandler implements IQueryHandler<
  VerifyAccessTokenQuery,
  VerifiedAccessTokenRecord
> {
  constructor(
    @Inject(ACCESS_TOKEN_SIGNER) private readonly signer: AccessTokenSigner,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({ accessToken }: VerifyAccessTokenQuery): Promise<VerifiedAccessTokenRecord> {
    const verified = await this.signer.verify(accessToken, this.clock.now());
    if (!verified) throw DomainError.unauthenticated('Session expired or invalid');
    return { actor: verified.actor, expiresAt: verified.expiresAt.toISOString() };
  }
}
