import type { AuthTokensRecord } from '@blotter/contracts';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { CLOCK, type Clock } from '../../../../shared/domain/clock.js';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import { USER_REPOSITORY, type UserRepository } from '../../domain/auth.repositories.js';
import { normaliseUsername } from '../../domain/user.js';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.port.js';
import { SessionIssuer } from '../session-issuer.js';

export class LoginCommand {
  constructor(
    readonly username: string,
    readonly password: string,
  ) {}
}

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, AuthTokensRecord> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute({ username, password }: LoginCommand): Promise<AuthTokensRecord> {
    const user = await this.users.findByUsername(normaliseUsername(username));
    // Always verify (against a dummy hash for unknown users) and give one message for both
    // failures, so neither the reply nor its timing reveals which usernames exist.
    const valid = await this.hasher.verify(password, user?.passwordHash ?? null);
    if (!user || !valid) throw DomainError.unauthenticated('Invalid username or password');
    return this.sessions.issue(user, this.clock.now());
  }
}
