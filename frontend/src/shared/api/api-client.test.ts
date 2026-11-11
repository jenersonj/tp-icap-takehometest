import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { json } from '@/test/render';

import { api, buildUrl, onSessionExpired, readCookie } from './api-client';
import { ApiError } from './api-error';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const call = (i: number) => {
  const [url, init] = fetchMock.mock.calls[i]!;
  return { url: String(url), init: init!, headers: init!.headers as Record<string, string> };
};

describe('api client', () => {
  it('builds query strings without empty values', () => {
    expect(buildUrl('/trades', { page: 2, symbol: '', side: undefined, sort: '-price' })).toBe(
      '/api/v1/trades?page=2&sort=-price',
    );
  });

  it('reads the CSRF cookie', () => {
    expect(readCookie('blotter_csrf', 'a=1; blotter_csrf=abc%3D; b=2')).toBe('abc=');
    expect(readCookie('nope', 'a=1')).toBeUndefined();
  });

  it('sends the CSRF header on writes only', async () => {
    document.cookie = 'blotter_csrf=token-1';
    fetchMock.mockImplementation(async () => json(200, { ok: true }));
    await api.get('/trades');
    await api.post('/trades', { a: 1 });
    expect(call(0).headers['x-csrf-token']).toBeUndefined();
    expect(call(1).headers['x-csrf-token']).toBe('token-1');
    expect(call(1).init.body).toBe('{"a":1}');
    expect(call(1).init.credentials).toBe('same-origin');
  });

  it('refreshes once on 401 and retries the request', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { statusCode: 401, code: 'UNAUTHENTICATED', message: 'x' }))
      .mockResolvedValueOnce(json(200, { user: {} }))
      .mockResolvedValueOnce(json(200, { items: [] }));
    await expect(api.get('/trades')).resolves.toEqual({ items: [] });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      '/api/v1/trades',
      '/api/v1/auth/refresh',
      '/api/v1/trades',
    ]);
  });

  it('shares one refresh between concurrent 401s', async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith('/auth/refresh')
        ? json(200, {})
        : fetchMock.mock.calls.filter(([u]) => String(u) === String(url)).length === 1
          ? json(401, { statusCode: 401, code: 'UNAUTHENTICATED', message: 'x' })
          : json(200, { url: String(url) }),
    );
    await Promise.all([api.get('/a'), api.get('/b')]);
    expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/auth/refresh'))).toHaveLength(
      1,
    );
  });

  it('tells session listeners and throws when the refresh fails', async () => {
    const expired = vi.fn();
    const off = onSessionExpired(expired);
    fetchMock
      .mockResolvedValueOnce(json(401, { statusCode: 401, code: 'UNAUTHENTICATED', message: 'x' }))
      .mockResolvedValueOnce(
        json(401, { statusCode: 401, code: 'UNAUTHENTICATED', message: 'dead' }),
      );
    const error = await api.get('/trades').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect(expired).toHaveBeenCalledOnce();
    off();
  });

  it('maps the error body to a typed ApiError', async () => {
    fetchMock.mockResolvedValue(
      json(409, {
        statusCode: 409,
        code: 'VERSION_CONFLICT',
        message: 'changed',
        details: [],
        correlationId: 'c-1',
      }),
    );
    const error = (await api.patch('/trades/1', {}).catch((e: unknown) => e)) as ApiError;
    expect(error).toMatchObject({ status: 409, code: 'VERSION_CONFLICT', correlationId: 'c-1' });
    expect(error.isConflict).toBe(true);
  });

  it('turns a network failure into a NETWORK ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.get('/trades')).rejects.toMatchObject({ code: 'NETWORK', status: 0 });
  });

  it('does not retry login', async () => {
    fetchMock.mockResolvedValue(
      json(401, { statusCode: 401, code: 'UNAUTHENTICATED', message: 'bad' }),
    );
    await expect(api.post('/auth/login', {})).rejects.toMatchObject({ message: 'bad' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
