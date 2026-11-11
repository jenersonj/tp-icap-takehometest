import type { RedeemedSocketTicketRecord } from '@blotter/contracts';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { CLOCK, type Clock } from '../../../../shared/domain/clock.js';
import { DomainError } from '../../../../shared/domain/domain-error.js';
import {
  SOCKET_TICKET_REPOSITORY,
  USER_REPOSITORY,
  type SocketTicketRepository,
  type UserRepository,
} from '../../domain/auth.repositories.js';
import { hashToken } from '../../domain/opaque-token.js';

export class RedeemSocketTicketCommand {
  constructor(readonly ticket: string) {}
}

/** Sent by realtime at the handshake. A ticket works once, within 30 s of being issued. */
@CommandHandler(RedeemSocketTicketCommand)
export class RedeemSocketTicketHandler implements ICommandHandler<
  RedeemSocketTicketCommand,
  RedeemedSocketTicketRecord
> {
  constructor(
    @Inject(SOCKET_TICKET_REPOSITORY) private readonly tickets: SocketTicketRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({ ticket }: RedeemSocketTicketCommand): Promise<RedeemedSocketTicketRecord> {
    const now = this.clock.now();
    const stored = await this.tickets.redeem(hashToken(ticket), now);
    if (!stored) {
      throw DomainError.unauthenticated('Socket ticket is invalid, expired or already used');
    }
    if (stored.sessionExpiresAt.getTime() <= now.getTime()) {
      throw DomainError.unauthenticated('Session expired, please sign in again');
    }
    const user = await this.users.findById(stored.userId);
    if (!user) throw DomainError.unauthenticated('Unknown user');
    return {
      userId: user.id,
      user: user.toSessionUser(),
      allowedGroups: stored.allowedGroups,
      sessionExpiresAt: stored.sessionExpiresAt.toISOString(),
    };
  }
}
