import { z } from 'zod';

/** `?symbols=AAPL,MSFT`; omitted means all symbols. */
export const ListPricesQuerySchema = z.object({
  symbols: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
        : undefined,
    ),
});
export type ListPricesQuery = z.output<typeof ListPricesQuerySchema>;

/** The RPC payload: the API has already split `?symbols=` into a list. */
export const ListPricesRequestSchema = z.object({
  symbols: z.array(z.string().trim().toUpperCase().min(1)).max(100).optional(),
});
export type ListPricesRequest = z.infer<typeof ListPricesRequestSchema>;
