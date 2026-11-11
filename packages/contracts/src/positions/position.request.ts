import { z } from 'zod';

export const ListPositionsQuerySchema = z.object({
  book: z.string().trim().min(1).max(32).optional(),
});
export type ListPositionsQuery = z.infer<typeof ListPositionsQuerySchema>;
export type ListPositionsRequest = ListPositionsQuery;
