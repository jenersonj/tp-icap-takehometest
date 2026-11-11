import type { Actor, Role, SessionUser } from '@blotter/contracts';

export interface UserState {
  id: string;
  username: string;
  passwordHash: string;
  traderCode: string;
  role: Role;
  books: string[];
}

/** Usernames are matched case-insensitively and stored lower-case. */
export function normaliseUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** A seeded user. Users are read-only for now: no sign-up or role changes. */
export class User {
  private constructor(private readonly state: UserState) {}

  static restore(state: UserState): User {
    return new User({ ...state, books: [...state.books] });
  }

  get id(): string {
    return this.state.id;
  }

  get role(): Role {
    return this.state.role;
  }

  get passwordHash(): string {
    return this.state.passwordHash;
  }

  /** What the web may see; never the password hash. */
  toSessionUser(): SessionUser {
    const { id, username, traderCode, role, books } = this.state;
    return { id, username, traderCode, role, books: [...books] };
  }

  /** Who is acting, as the API sends it with every command. */
  toActor(): Actor {
    const { id, username, traderCode, role, books } = this.state;
    return { userId: id, username, traderCode, role, books: [...books] };
  }
}
