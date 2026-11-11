import type { SessionDto, TradeDto } from '@blotter/contracts';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionProvider } from '@/features/auth/session';
import { SideDrawerContent } from '@/shared/components/side-drawer';
import { Sheet } from '@/shared/ui/sheet';
import { json, renderWithProviders } from '@/test/render';

import { toPage, toSortParam } from './blotter-grid';
import { TradeForm } from './trade-form-sheet';
import { diffChanges, formDefaults, TradeFormSchema } from './trade-form-schema';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const session: SessionDto = {
  user: {
    id: 'u',
    username: 'jsmith',
    traderCode: 'JSMITH',
    role: 'TRADER',
    books: ['EQUITIES_US'],
  },
  expiresAt: '2026-11-11T10:00:00Z',
};

const trade: TradeDto = {
  id: '22222222-2222-4222-8222-222222222222',
  tradeRef: 'TRD-100001',
  symbol: 'AAPL',
  side: 'BUY',
  quantity: 300,
  price: 227.45,
  notional: 68235,
  trader: 'JSMITH',
  book: 'EQUITIES_US',
  counterparty: 'Citi',
  tradeTimestamp: '2026-11-11T09:00:00.000Z',
  status: 'ACTIVE',
  version: 1,
  updatedAt: '2026-11-11T09:00:00.000Z',
};

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function renderForm(initial?: TradeDto, onDone = vi.fn()) {
  renderWithProviders(
    <SessionProvider value={session}>
      <Sheet open>
        <SideDrawerContent>
          <TradeForm initial={initial} onDone={onDone} />
        </SideDrawerContent>
      </Sheet>
    </SessionProvider>,
  );
  return onDone;
}

describe('diffChanges', () => {
  it('returns only the fields that changed', () => {
    const values = TradeFormSchema.parse({
      ...formDefaults(trade),
      quantity: 400,
      trader: 'jsmith',
    });
    expect(diffChanges(trade, values)).toEqual({ quantity: 400 });
  });

  it('ignores sub-second differences in the trade time', () => {
    const values = TradeFormSchema.parse(
      formDefaults({ ...trade, tradeTimestamp: '2026-11-11T09:00:00.400Z' }),
    );
    expect(diffChanges(trade, values)).toEqual({});
  });
});

describe('grid query mapping', () => {
  it('maps the sort model and block start to the list query', () => {
    expect(toSortParam([{ colId: 'price', sort: 'desc' }])).toBe('-price');
    expect(toSortParam([{ colId: 'symbol', sort: 'asc' }])).toBe('symbol');
    expect(toSortParam([{ colId: 'notional', sort: 'asc' }])).toBe('-tradeTimestamp');
    expect(toSortParam([])).toBe('-tradeTimestamp');
    expect(toPage(0)).toBe(1);
    expect(toPage(200)).toBe(3);
  });
});

describe('TradeForm', () => {
  it('validates with the shared schema before calling the API', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Book trade' }));
    expect(await screen.findByText('Symbol is required')).toBeInTheDocument();
    expect(screen.getByText('Quantity must be a number')).toBeInTheDocument();
    expect(screen.getByText('Counterparty is required')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('amends with the version and only the changed fields', async () => {
    fetchMock.mockResolvedValue(json(200, { ...trade, quantity: 400, version: 2 }));
    const onDone = renderForm(trade);
    const qty = screen.getByLabelText('Quantity');
    await userEvent.clear(qty);
    await userEvent.type(qty, '400');
    await userEvent.click(screen.getByRole('button', { name: 'Amend trade' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`/api/v1/trades/${trade.id}`);
    expect(init!.method).toBe('PATCH');
    expect(JSON.parse(String(init!.body))).toEqual({ version: 1, changes: { quantity: 400 } });
  });

  it('says nothing changed instead of sending an empty amend', async () => {
    renderForm(trade);
    await userEvent.click(screen.getByRole('button', { name: 'Amend trade' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('on a version conflict asks to reload, then amends from the latest version', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json(409, {
          statusCode: 409,
          code: 'VERSION_CONFLICT',
          message: 'changed by someone else',
        }),
      )
      .mockResolvedValueOnce(json(200, { ...trade, quantity: 350, version: 2 }));
    renderForm(trade);
    const qty = screen.getByLabelText('Quantity');
    await userEvent.clear(qty);
    await userEvent.type(qty, '400');
    await userEvent.click(screen.getByRole('button', { name: 'Amend trade' }));

    expect(await screen.findByText('This trade was changed by someone else')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Amend trade' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /Reload/ }));
    await waitFor(() =>
      expect(screen.queryByText('This trade was changed by someone else')).toBeNull(),
    );
    expect(screen.getByLabelText('Quantity')).toHaveValue(350);
    expect(screen.getByText(/Version 2/)).toBeInTheDocument();
  });

  it('shows business-rule errors from the service on their fields', async () => {
    fetchMock.mockResolvedValue(
      json(422, {
        statusCode: 422,
        code: 'VALIDATION_FAILED',
        message: 'Trade time cannot be in the future',
        details: [{ path: 'tradeTimestamp', message: 'Trade time cannot be in the future' }],
      }),
    );
    renderForm(trade);
    await userEvent.clear(screen.getByLabelText('Quantity'));
    await userEvent.type(screen.getByLabelText('Quantity'), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Amend trade' }));
    expect(await screen.findAllByText('Trade time cannot be in the future')).toHaveLength(2);
  });
});
