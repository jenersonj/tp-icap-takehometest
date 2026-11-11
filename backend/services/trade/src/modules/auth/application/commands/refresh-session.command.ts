import type { AuthTokensRecord } from '@blotter/contracts';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { UNIT_OF_WORK, type UnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { CLOCK, type Clock } from '../../../../shared/domain/clock.js';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import { refreshTokenState } from '../../domain/auth-policy.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
  type RefreshTokenRepository,
  type UserRepository,
} from '../../domain/auth.repositories.js';
import { hashToken } from '../../domain/opaque-token.js';
import { SessionIssuer } from '../session-issuer.js';

export class RefreshSessionCommand {
  constructor(readonly refreshToken: string) {}
}

const invalid = () => DomainError.unauthenticated('Session expired, please sign in again');

/**
 * Rotates the refresh token: the presented one is revoked and a new pair is issued in one
 * transaction. Presenting an already revoked token means it was copied and replayed, so
 * every session of that user is revoked (refresh-token reuse detection).
 */
@CommandHandler(RefreshSessionCommand)
export class RefreshSessionHandler implements ICommandHandler<
  RefreshSessionCommand,
  AuthTokensRecord
> {
  private readonly logger = new Logger(RefreshSessionHandler.name);

  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute({ refreshToken }: RefreshSessionCommand): Promise<AuthTokensRecord> {
    const now = this.clock.now();
    const stored = await this.refreshTokens.findByHash(hashToken(refreshToken));
    if (!stored) throw invalid();

    const state = refreshTokenState(stored, now);
    if (state === 'revoked') {
      this.logger.warn(`Revoked refresh token reused for user ${stored.userId}; revoking all`);
      await this.refreshTokens.revokeAllForUser(stored.userId, now);
      throw invalid();
    }
    if (state === 'expired') throw invalid();

    return this.uow.run(async () => {
      // Conditional revoke: of two concurrent refreshes with the same token, one wins.
      if (!(await this.refreshTokens.revoke(stored.id, now))) throw invalid();
      const user = await this.users.findById(stored.userId);
      if (!user) throw invalid();
      return this.sessions.issue(user, now);
    });
  }
}
