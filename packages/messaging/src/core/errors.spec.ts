import { describe, expect, it } from 'vitest';

import { CodedError, toRpcErrorBody } from './errors.js';

describe('toRpcErrorBody', () => {
  it('keeps code, message and details of coded errors', () => {
    expect(toRpcErrorBody(new CodedError('NOT_FOUND', 'Trade not found', { id: 'x' }))).toEqual({
      code: 'NOT_FOUND',
      message: 'Trade not found',
      details: { id: 'x' },
    });
  });

  it('accepts errors that carry the coded-error brand without extending CodedError', () => {
    const brand = Symbol.for('blotter.coded-error');
    class DomainError extends Error {
      readonly [brand] = true;
      constructor(
        readonly code: string,
        message: string,
      ) {
        super(message);
      }
    }
    expect(toRpcErrorBody(new DomainError('INVALID_STATE', 'Trade is cancelled'))).toEqual({
      code: 'INVALID_STATE',
      message: 'Trade is cancelled',
    });
  });

  it('hides anything that is not a CodedError, including Node system errors', () => {
    const sys = Object.assign(new Error('connect ECONNREFUSED 10.0.0.1'), { code: 'ECONNREFUSED' });
    expect(toRpcErrorBody(sys)).toEqual({ code: 'INTERNAL', message: 'Internal error' });
    expect(toRpcErrorBody('oops')).toEqual({ code: 'INTERNAL', message: 'Internal error' });
  });
});
