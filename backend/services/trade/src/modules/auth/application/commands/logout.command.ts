import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { CLOCK, type Clock } from '../../../../shared/domain/clock.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/auth.repositories.js';
import { hashToken } from '../../domain/opaque-token.js';

export class LogoutCommand {
  constructor(readonly refreshToken: string) {}
}

/** Revokes the refresh token. Idempotent: an unknown or revoked token is not an error. */
@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, { revoked: boolean }> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({ refreshToken }: LogoutCommand): Promise<{ revoked: boolean }> {
    const stored = await this.refreshTokens.findByHash(hashToken(refreshToken));
    if (!stored || stored.revokedAt) return { revoked: false };
    return { revoked: await this.refreshTokens.revoke(stored.id, this.clock.now()) };
  }
}
