import { newCorrelationId, runWithCorrelationId } from '@blotter/messaging';
import type { NextFunction, Request, Response } from 'express';

export const CORRELATION_HEADER = 'x-correlation-id';

/** Every request runs under one correlation id, carried on each RPC and echoed back. */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get(CORRELATION_HEADER);
  const id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : newCorrelationId();
  res.setHeader(CORRELATION_HEADER, id);
  runWithCorrelationId(id, next);
}
