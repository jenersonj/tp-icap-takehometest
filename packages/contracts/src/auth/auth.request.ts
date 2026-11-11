import { z } from 'zod';

/** Body of POST /api/v1/auth/login. */
export const LoginInputSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(64),
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export type LoginRequest = LoginInput;

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

/** userId comes from the verified access-token cookie, never from the client. */
export interface IssueSocketTicketRequest {
  userId: string;
  /** Access-token expiry; realtime disconnects the socket at this time. */
  sessionExpiresAt: string;
}

export interface RedeemSocketTicketRequest {
  ticket: string;
}
