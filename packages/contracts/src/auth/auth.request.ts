import { z } from 'zod';

/** Body of POST /api/v1/auth/login. */
export const LoginInputSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(64),
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export type LoginRequest = LoginInput;

const OpaqueToken = z.string().min(16).max(512);

export const RefreshRequestSchema = z.object({ refreshToken: OpaqueToken });
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const LogoutRequestSchema = z.object({ refreshToken: OpaqueToken });
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;

/** userId comes from the verified access-token cookie, never from the client. */
export const IssueSocketTicketRequestSchema = z.object({
  userId: z.uuid(),
  /** Access-token expiry; realtime disconnects the socket at this time. */
  sessionExpiresAt: z.iso.datetime({ offset: true }),
});
export type IssueSocketTicketRequest = z.infer<typeof IssueSocketTicketRequestSchema>;

export const RedeemSocketTicketRequestSchema = z.object({ ticket: OpaqueToken });
export type RedeemSocketTicketRequest = z.infer<typeof RedeemSocketTicketRequestSchema>;

export const VerifyAccessTokenRequestSchema = z.object({
  accessToken: z.string().min(1).max(4096),
});
export type VerifyAccessTokenRequest = z.infer<typeof VerifyAccessTokenRequestSchema>;
