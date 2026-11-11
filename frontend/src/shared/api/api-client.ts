import { AuthCookies, CSRF_HEADER, type ApiErrorBody } from '@blotter/contracts';

import { ApiError } from './api-error';

export const API_BASE = '/api/v1';

type Query = Record<string, string | number | undefined | null>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

/** Paths that must not trigger the refresh-and-retry dance. */
const NO_RETRY = new Set(['/auth/login', '/auth/refresh', '/auth/logout']);

/** Reads a cookie the page may see (only the CSRF cookie is readable; tokens are httpOnly). */
export function readCookie(
  name: string,
  cookies = globalThis.document?.cookie ?? '',
): string | undefined {
  for (const part of cookies.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

let refreshing: Promise<boolean> | null = null;
const sessionListeners = new Set<() => void>();

/** Called when the session is gone for good (refresh failed); the app redirects to /login. */
export function onSessionExpired(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

/** One refresh at a time: concurrent 401s wait for the same attempt. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= send('/auth/refresh', { method: 'POST' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function send(
  path: string,
  { method = 'GET', body, query, signal }: RequestOptions,
): Promise<Response> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (method !== 'GET') {
    const csrf = readCookie(AuthCookies.CSRF_TOKEN);
    if (csrf) headers[CSRF_HEADER] = csrf;
  }
  return fetch(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    signal,
  });
}

async function toError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as Partial<ApiErrorBody> | null;
  return new ApiError({
    ...body,
    statusCode: res.status,
    message: body?.message ?? res.statusText ?? 'Request failed',
  });
}

/**
 * Typed fetch for /api/v1. Sends the CSRF header on writes, and on a 401 refreshes the
 * session once and retries; if that fails it tells the session listeners and throws.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await send(path, options);
    if (res.status === 401 && !NO_RETRY.has(path)) {
      if (await refreshSession()) {
        res = await send(path, options);
      }
      if (res.status === 401) for (const listener of sessionListeners) listener();
    }
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;
    throw ApiError.network(error);
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    apiRequest<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
};
