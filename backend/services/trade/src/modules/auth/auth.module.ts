import { Module } from '@nestjs/common';

import { SERVICE_CONFIG, type ServiceConfig } from '../../config/service.config.js';
import { IssueSocketTicketHandler } from './application/commands/issue-socket-ticket.command.js';
import { LoginHandler } from './application/commands/login.command.js';
import { LogoutHandler } from './application/commands/logout.command.js';
import { RedeemSocketTicketHandler } from './application/commands/redeem-socket-ticket.command.js';
import { RefreshSessionHandler } from './application/commands/refresh-session.command.js';
import { ACCESS_TOKEN_SIGNER } from './application/ports/access-token-signer.port.js';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port.js';
import { VerifyAccessTokenHandler } from './application/queries/verify-access-token.query.js';
import { SessionIssuer } from './application/session-issuer.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  SOCKET_TICKET_REPOSITORY,
  USER_REPOSITORY,
} from './domain/auth.repositories.js';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher.js';
import { JoseAccessTokenSigner } from './infrastructure/jose-access-token-signer.js';
import {
  PrismaRefreshTokenRepository,
  PrismaSocketTicketRepository,
  PrismaUserRepository,
} from './infrastructure/prisma-auth.repositories.js';
import { UserSeeder } from './infrastructure/user-seeder.js';
import { AuthRpcController } from './interface/auth.rpc-controller.js';

@Module({
  controllers: [AuthRpcController],
  providers: [
    SessionIssuer,
    LoginHandler,
    RefreshSessionHandler,
    LogoutHandler,
    IssueSocketTicketHandler,
    RedeemSocketTicketHandler,
    VerifyAccessTokenHandler,
    UserSeeder,
    { provide: PASSWORD_HASHER, useValue: new BcryptPasswordHasher() },
    {
      provide: ACCESS_TOKEN_SIGNER,
      inject: [SERVICE_CONFIG],
      useFactory: (config: ServiceConfig) => new JoseAccessTokenSigner(config.JWT_SECRET),
    },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: SOCKET_TICKET_REPOSITORY, useClass: PrismaSocketTicketRepository },
  ],
})
export class AuthModule {}
