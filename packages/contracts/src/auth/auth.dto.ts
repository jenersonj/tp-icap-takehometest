import type { IsoDateTime } from '../common/primitives.js';
import type { SessionUser } from './auth.response.js';

/** What the web gets after login/refresh; tokens stay in httpOnly cookies, never in JS. */
export interface SessionDto {
  user: SessionUser;
  expiresAt: IsoDateTime;
}

export interface SocketTicketDto {
  ticket: string;
  expiresAt: IsoDateTime;
}
