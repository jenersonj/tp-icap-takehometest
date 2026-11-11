import { z } from 'zod';

/** ISO-8601 UTC timestamp string, e.g. 2026-08-18T09:15:23Z. */
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
export type IsoDateTime = string;

export const UuidSchema = z.uuid();

/** A positive amount with at most 6 decimal places (matches Decimal(18, 6) in Postgres). */
export const PriceSchema = z
  .number({ error: 'Price must be a number' })
  .positive('Price must be positive')
  .max(1_000_000_000, 'Price is too large')
  .refine((n) => Number.isFinite(n) && Math.abs(Math.round(n * 1e6) - n * 1e6) < 1e-6, {
    message: 'Price can have at most 6 decimal places',
  });

/** Whole number of shares. */
export const QuantitySchema = z
  .number({ error: 'Quantity must be a number' })
  .int('Quantity must be a whole number')
  .positive('Quantity must be positive')
  .max(100_000_000, 'Quantity is too large');
