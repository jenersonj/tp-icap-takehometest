export interface PasswordHasher {
  hash(password: string): Promise<string>;
  /**
   * With a null hash (unknown user) it still does the same work against a dummy hash, so
   * the response time does not reveal which usernames exist.
   */
  verify(password: string, hash: string | null): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
