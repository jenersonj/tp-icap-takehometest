import { AuthCookies, AuthPatterns, type Actor, type SocketTicketDto } from '@blotter/contracts';
import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentActor, SessionExpiresAt } from '../shared/auth/decorators.js';
import { RpcClient } from '../shared/rpc-client.js';

@ApiTags('realtime')
@ApiCookieAuth(AuthCookies.ACCESS_TOKEN)
@Controller({ path: 'realtime', version: '1' })
export class RealtimeController {
  constructor(private readonly rpc: RpcClient) {}

  /** The user id and session expiry come from the verified cookie, never from the body. */
  @Post('ticket')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Single-use socket ticket, valid 30 s' })
  issueTicket(
    @CurrentActor() actor: Actor,
    @SessionExpiresAt() sessionExpiresAt: string,
  ): Promise<SocketTicketDto> {
    return this.rpc.request(AuthPatterns.ISSUE_SOCKET_TICKET, {
      userId: actor.userId,
      sessionExpiresAt,
    });
  }
}
