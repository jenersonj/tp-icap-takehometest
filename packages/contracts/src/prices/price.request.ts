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
export type ListPricesRequest = ListPricesQuery;
