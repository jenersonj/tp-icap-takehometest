import { z } from 'zod';

export const MAX_PAGE_SIZE = 500;
export const DEFAULT_PAGE_SIZE = 100;

export const PageQuerySchema = z.object({
  /** 1-based page number. */
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PageQuery = z.infer<typeof PageQuerySchema>;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
