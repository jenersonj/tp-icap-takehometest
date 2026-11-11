import { z } from 'zod';

import { ActorSchema } from '../common/actor.js';
import { PageQuerySchema } from '../common/pagination.js';
import {
  IsoDateTimeSchema,
  PriceSchema,
  QuantitySchema,
  UuidSchema,
} from '../common/primitives.js';
import {
  SideSchema,
  TRADE_SORT_FIELDS,
  TradeStatusSchema,
  type TradeSortField,
} from './trade.model.js';

/*
 * Shape validation only. Business rules (known symbol, book the user may trade, state
 * transitions) are enforced by the Trade aggregate in the service.
 */

const SymbolSchema = z
  .string({ error: 'Symbol is required' })
  .trim()
  .toUpperCase()
  .min(1, 'Symbol is required')
  .max(12, 'Symbol is too long')
  .regex(/^[A-Z0-9.]+$/, 'Symbol may contain only letters, digits and dots');

const TraderSchema = z
  .string({ error: 'Trader is required' })
  .trim()
  .toUpperCase()
  .min(2, 'Trader is required')
  .max(12, 'Trader code is too long')
  .regex(/^[A-Z]+$/, 'Trader code may contain only letters');

const RequiredText = (label: string, max = 64) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);

/** Body of POST /api/v1/trades, also used by the create form. */
export const CreateTradeInputSchema = z.object({
  symbol: SymbolSchema,
  side: SideSchema,
  quantity: QuantitySchema,
  price: PriceSchema,
  trader: TraderSchema,
  book: RequiredText('Book', 32),
  counterparty: RequiredText('Counterparty'),
  /** Defaults to "now" in the service when omitted. */
  tradeTimestamp: IsoDateTimeSchema.optional(),
});
export type CreateTradeInput = z.infer<typeof CreateTradeInputSchema>;

/** Every business field is optional on amend, but at least one must change. */
export const TradeChangesSchema = CreateTradeInputSchema.extend({
  tradeTimestamp: IsoDateTimeSchema,
})
  .partial()
  .refine((changes) => Object.values(changes).some((v) => v !== undefined), {
    message: 'At least one field must change',
  });
export type TradeChanges = z.infer<typeof TradeChangesSchema>;

/** Body of PATCH /api/v1/trades/:id. */
export const AmendTradeInputSchema = z.object({
  version: z.number().int().positive(),
  changes: TradeChangesSchema,
});
export type AmendTradeInput = z.infer<typeof AmendTradeInputSchema>;

/** Body of POST /api/v1/trades/:id/cancel. */
export const CancelTradeInputSchema = z.object({
  version: z.number().int().positive(),
  reason: z.string().trim().max(200).optional(),
});
export type CancelTradeInput = z.infer<typeof CancelTradeInputSchema>;

export interface SortSpec<F extends string> {
  field: F;
  direction: 'asc' | 'desc';
}

const sortPattern = new RegExp(`^-?(${TRADE_SORT_FIELDS.join('|')})$`);

/** `sort=-tradeTimestamp` means descending; no prefix means ascending. */
export const TradeSortSchema = z
  .string()
  .regex(
    sortPattern,
    `sort must be one of ${TRADE_SORT_FIELDS.join(', ')}, optionally prefixed with -`,
  )
  .default('-tradeTimestamp')
  .transform((value): SortSpec<TradeSortField> => {
    const desc = value.startsWith('-');
    return {
      field: (desc ? value.slice(1) : value) as TradeSortField,
      direction: desc ? 'desc' : 'asc',
    };
  });

const optionalFilter = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .optional()
  .or(z.literal('').transform(() => undefined));

const TradeListFiltersSchema = PageQuerySchema.extend({
  status: TradeStatusSchema.optional(),
  side: SideSchema.optional(),
  symbol: optionalFilter,
  book: optionalFilter,
  trader: optionalFilter,
  counterparty: optionalFilter,
  from: IsoDateTimeSchema.optional(),
  to: IsoDateTimeSchema.optional(),
});

const fromBeforeTo = (q: { from?: string | undefined; to?: string | undefined }) =>
  !q.from || !q.to || q.from <= q.to;
const fromBeforeToIssue = { message: '`from` must be before `to`', path: ['from'] };

/** Query string of GET /api/v1/trades (values arrive as strings, hence coerce). */
export const ListTradesQuerySchema = TradeListFiltersSchema.extend({
  sort: TradeSortSchema,
}).refine(fromBeforeTo, fromBeforeToIssue);
/** What the web sends (all strings optional). */
export type ListTradesQueryInput = z.input<typeof ListTradesQuerySchema>;
/** What the API forwards to the service as `trade.list`. */
export type ListTradesQuery = z.output<typeof ListTradesQuerySchema>;

export const TradeSortSpecSchema = z.object({
  field: z.enum(TRADE_SORT_FIELDS),
  direction: z.enum(['asc', 'desc']),
});

/** The `trade.list` RPC payload as the service validates it (sort already parsed). */
export const ListTradesRequestSchema = TradeListFiltersSchema.extend({
  sort: TradeSortSpecSchema,
}).refine(fromBeforeTo, fromBeforeToIssue);

export const TradeIdParamSchema = z.object({ id: UuidSchema });

/* ---- RPC payloads (API -> service) ---- */

export type ListTradesRequest = ListTradesQuery;

export interface GetTradeRequest {
  id: string;
}

export const CreateTradeRequestSchema = z.object({
  actor: ActorSchema,
  input: CreateTradeInputSchema,
});
export type CreateTradeRequest = z.infer<typeof CreateTradeRequestSchema>;

export interface AmendTradeRequest {
  actor: z.infer<typeof ActorSchema>;
  id: string;
  version: number;
  changes: TradeChanges;
}

export interface CancelTradeRequest {
  actor: z.infer<typeof ActorSchema>;
  id: string;
  version: number;
  reason?: string;
}
