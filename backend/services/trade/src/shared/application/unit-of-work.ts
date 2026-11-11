/**
 * Runs work in one database transaction. Repositories called inside `run` join it, so a
 * trade and its audit row commit or roll back together.
 */
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
