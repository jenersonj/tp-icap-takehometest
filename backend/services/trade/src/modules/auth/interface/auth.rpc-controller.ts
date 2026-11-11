import {
  AuthPatterns,
  IssueSocketTicketRequestSchema,
  LoginInputSchema,
  LogoutRequestSchema,
  RedeemSocketTicketRequestSchema,
  RefreshRequestSchema,
  VerifyAccessTokenRequestSchema,
  type AuthTokensRecord,
  type IssueSocketTicketRequest,
  type LoginRequest,
  type LogoutRequest,
  type RedeemedSocketTicketRecord,
  type RedeemSocketTicketRequest,
  type RefreshRequest,
  type SocketTicketRecord,
  type VerifiedAccessTokenRecord,
  type VerifyAccessTokenRequest,
} from '@blotter/contracts';
import { RpcPayload, RpcRoute } from '@blotter/messaging';
import { Controller } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { parse } from '../../../shared/interface/parse-payload.js';
import { IssueSocketTicketCommand } from '../application/commands/issue-socket-ticket.command.js';
import { LoginCommand } from '../application/commands/login.command.js';
import { LogoutCommand } from '../application/commands/logout.command.js';
import { RedeemSocketTicketCommand } from '../application/commands/redeem-socket-ticket.command.js';
import { RefreshSessionCommand } from '../application/commands/refresh-session.command.js';
import { VerifyAccessTokenQuery } from '../application/queries/verify-access-token.query.js';

/** Auth RPCs: the API calls login/refresh/logout/verify/issue; realtime calls redeem. */
@Controller()
export class AuthRpcController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @RpcRoute(AuthPatterns.LOGIN)
  login(@RpcPayload() payload: LoginRequest): Promise<AuthTokensRecord> {
    const { username, password } = parse(LoginInputSchema, payload);
    return this.commands.execute(new LoginCommand(username, password));
  }

  @RpcRoute(AuthPatterns.REFRESH)
  refresh(@RpcPayload() payload: RefreshRequest): Promise<AuthTokensRecord> {
    const { refreshToken } = parse(RefreshRequestSchema, payload);
    return this.commands.execute(new RefreshSessionCommand(refreshToken));
  }

  @RpcRoute(AuthPatterns.LOGOUT)
  logout(@RpcPayload() payload: LogoutRequest): Promise<{ revoked: boolean }> {
    const { refreshToken } = parse(LogoutRequestSchema, payload);
    return this.commands.execute(new LogoutCommand(refreshToken));
  }

  @RpcRoute(AuthPatterns.VERIFY_ACCESS_TOKEN)
  verify(@RpcPayload() payload: VerifyAccessTokenRequest): Promise<VerifiedAccessTokenRecord> {
    const { accessToken } = parse(VerifyAccessTokenRequestSchema, payload);
    return this.queries.execute(new VerifyAccessTokenQuery(accessToken));
  }

  @RpcRoute(AuthPatterns.ISSUE_SOCKET_TICKET)
  issueSocketTicket(@RpcPayload() payload: IssueSocketTicketRequest): Promise<SocketTicketRecord> {
    const { userId, sessionExpiresAt } = parse(IssueSocketTicketRequestSchema, payload);
    return this.commands.execute(new IssueSocketTicketCommand(userId, new Date(sessionExpiresAt)));
  }

  @RpcRoute(AuthPatterns.REDEEM_SOCKET_TICKET)
  redeemSocketTicket(
    @RpcPayload() payload: RedeemSocketTicketRequest,
  ): Promise<RedeemedSocketTicketRecord> {
    const { ticket } = parse(RedeemSocketTicketRequestSchema, payload);
    return this.commands.execute(new RedeemSocketTicketCommand(ticket));
  }
}
