import { ErrorCode, type FieldIssue } from '@blotter/contracts';
import { CodedError } from '@blotter/messaging';
import type { z } from 'zod';

/**
 * Shape validation at the HTTP edge with the shared zod schemas. A failure is BAD_REQUEST
 * (400) with one issue per field; business rules are left to the service.
 */
export function validate<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const details: FieldIssue[] = result.error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }));
  throw new CodedError(ErrorCode.BAD_REQUEST, details[0]?.message ?? 'Invalid request', details);
}
