import { ErrorCode, type FieldIssue } from '@blotter/contracts';

/** Same global symbol the messaging layer checks (see CODED_ERROR_BRAND in @blotter/messaging). */
const CODED_ERROR_BRAND = Symbol.for('blotter.coded-error');

/**
 * A business-rule failure. It carries one of the shared error codes and the global
 * coded-error brand, so the messaging layer passes code, message and details to the caller
 * without the domain depending on messaging.
 */
export class DomainError extends Error {
  readonly [CODED_ERROR_BRAND] = true;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }

  static validation(issues: FieldIssue[]): DomainError {
    const first = issues[0]?.message ?? 'Validation failed';
    return new DomainError(
      ErrorCode.VALIDATION_FAILED,
      issues.length > 1 ? 'Validation failed' : first,
      issues,
    );
  }

  static notFound(entity: string, id: string): DomainError {
    return new DomainError(ErrorCode.NOT_FOUND, `${entity} ${id} was not found`, { id });
  }

  static forbidden(message: string): DomainError {
    return new DomainError(ErrorCode.FORBIDDEN, message);
  }

  static invalidState(message: string): DomainError {
    return new DomainError(ErrorCode.INVALID_STATE, message);
  }

  static versionConflict(expected: number, actual: number): DomainError {
    return new DomainError(
      ErrorCode.VERSION_CONFLICT,
      'The trade was changed by someone else. Reload it and try again.',
      { expectedVersion: expected, currentVersion: actual },
    );
  }
}
