import { ErrorCode } from '@blotter/contracts';
import type { z } from 'zod';

import { DomainError } from '../domain/domain-error.js';

/**
 * Validates an RPC payload. The API already checked the shape, but the queue is a trust
 * boundary too, so a malformed message fails with BAD_REQUEST instead of reaching a handler.
 */
export function parse<S extends z.ZodType>(schema: S, payload: unknown): z.output<S> {
  const result = schema.safeParse(payload);
  if (result.success) return result.data;
  const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  throw new DomainError(ErrorCode.BAD_REQUEST, 'Malformed request', details);
}
