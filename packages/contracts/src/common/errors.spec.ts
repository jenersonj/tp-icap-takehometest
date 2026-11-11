import { describe, expect, it } from 'vitest';

import { ErrorCode, httpStatusFor } from './errors';

describe('httpStatusFor', () => {
  it('maps the codes named in ARCHITECTURE.md', () => {
    expect(httpStatusFor(ErrorCode.VALIDATION_FAILED)).toBe(422);
    expect(httpStatusFor(ErrorCode.NOT_FOUND)).toBe(404);
    expect(httpStatusFor(ErrorCode.VERSION_CONFLICT)).toBe(409);
    expect(httpStatusFor(ErrorCode.INVALID_STATE)).toBe(409);
  });

  it('falls back to 500 for unknown codes', () => {
    expect(httpStatusFor('SOMETHING_ELSE')).toBe(500);
  });
});
