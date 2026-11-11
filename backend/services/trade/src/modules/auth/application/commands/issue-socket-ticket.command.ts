import type { SocketTicketRecord } from '@blotter/contracts';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { SERVICE_CONFIG, type ServiceConfig } from '../../../../config/service.config.js';
import { CLOCK, type Clock } from '../../../../shared/domain/clock.js';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import { allowedGroupsFor, SOCKET_TICKET_TTL_MS } from '../../domain/auth-policy.js';
import {
  SOCKET_TICKET_REPOSITORY,
  USER_REPOSITORY,
  type SocketTicketRepository,
  type UserRepository,
} from '../../domain/auth.repositories.js';
import { hashToken, newOpaqueToken } from '../../domain/opaque-token.js';

export class IssueSocketTicketCommand {
  constructor(
    readonly userId: string,
    readonly sessionExpiresAt: Date,
  ) {}
}

/**
 * A single-use ticket, valid 30 s, that realtime redeems at the socket handshake. The
 * allowed groups are decided here, from the user's role, so realtime decides nothing.
 */
@CommandHandler(IssueSocketTicketCommand)
export class IssueSocketTicketHandler implements ICommandHandler<
  IssueSocketTicketCommand,
  SocketTicketRecord
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SOCKET_TICKET_REPOSITORY) private readonly tickets: SocketTicketRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(SERVICE_CONFIG)
    private readonly config: Pick<ServiceConfig, 'ACCESS_TOKEN_TTL_SECONDS'>,
  ) {}

  async execute({
    userId,
    sessionExpiresAt,
  }: IssueSocketTicketCommand): Promise<SocketTicketRecord> {
    const now = this.clock.now();
    if (sessionExpiresAt.getTime() <= now.getTime()) {
      throw DomainError.unauthenticated('Session expired, please sign in again');
    }
    const user = await this.users.findById(userId);
    if (!user) throw DomainError.unauthenticated('Unknown user');

    // Never let a socket outlive what an access token issued now could.
    const maxSession = now.getTime() + this.config.ACCESS_TOKEN_TTL_SECONDS * 1000;
    const ticket = newOpaqueToken();
    const expiresAt = new Date(now.getTime() + SOCKET_TICKET_TTL_MS);
    await this.tickets.insert({
      id: hashToken(ticket),
      userId: user.id,
      allowedGroups: allowedGroupsFor(user.role),
      expiresAt,
      sessionExpiresAt: new Date(Math.min(sessionExpiresAt.getTime(), maxSession)),
    });
    return { ticket, expiresAt: expiresAt.toISOString() };
  }
}
