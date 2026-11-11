import type { Actor, Role } from '../common/actor.js';
import type { IsoDateTime } from '../common/primitives.js';

export interface SessionUser {
  id: string;
  username: string;
  traderCode: string;
  role: Role;
  books: string[];
}

/** Reply to auth.login and auth.refresh. The API turns the tokens into httpOnly cookies. */
export interface AuthTokensRecord {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: IsoDateTime;
  refreshTokenExpiresAt: IsoDateTime;
  user: SessionUser;
}

export interface SocketTicketRecord {
  ticket: string;
  expiresAt: IsoDateTime;
}

export interface RedeemedSocketTicketRecord {
  userId: string;
  user: SessionUser;
  allowedGroups: string[];
  sessionExpiresAt: IsoDateTime;
}

/** Reply to auth.verifyAccessToken: who the caller is, ready to send with commands. */
export interface VerifiedAccessTokenRecord {
  actor: Actor;
  expiresAt: IsoDateTime;
}
