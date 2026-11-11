import { z } from 'zod';

export const Role = { TRADER: 'TRADER', VIEWER: 'VIEWER' } as const;
export type Role = (typeof Role)[keyof typeof Role];
export const RoleSchema = z.enum([Role.TRADER, Role.VIEWER]);

/**
 * Who is making a request. The API builds it from the verified access-token cookie and
 * sends it with every command, so the service can authorise and audit without HTTP.
 */
export const ActorSchema = z.object({
  userId: z.string().min(1),
  username: z.string().min(1),
  traderCode: z.string().min(1),
  role: RoleSchema,
  books: z.array(z.string()),
});

export type Actor = z.infer<typeof ActorSchema>;
