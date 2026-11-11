import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/shared/api/query-keys';
import { json, renderWithProviders } from '@/test/render';

import { LoginForm } from './login-form';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const session = {
  user: { id: 'u', username: 'jsmith', traderCode: 'JSMITH', role: 'TRADER', books: [] },
  expiresAt: '2026-11-11T10:00:00Z',
};

describe('LoginForm', () => {
  it('shows field errors from the shared zod schema without calling the API', async () => {
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Username is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the server error for bad credentials', async () => {
    fetchMock.mockResolvedValue(
      json(401, {
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Invalid username or password',
      }),
    );
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Username'), 'jsmith');
    await userEvent.type(screen.getByLabelText('Password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
  });

  it('stores the session and calls onSuccess', async () => {
    fetchMock.mockResolvedValue(json(200, session));
    const onSuccess = vi.fn();
    const { queryClient } = renderWithProviders(<LoginForm onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText('Username'), 'jsmith');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(queryClient.getQueryData(queryKeys.session)).toEqual(session);
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toEqual({
      username: 'jsmith',
      password: 'password123',
    });
  });
});
