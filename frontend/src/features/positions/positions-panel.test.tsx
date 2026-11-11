import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { PositionsTable } from './positions-panel';

describe('PositionsTable', () => {
  it('shows each position with coloured P&L and the totals', () => {
    renderWithProviders(
      <PositionsTable
        summary={{
          positions: [
            {
              symbol: 'AAPL',
              netQuantity: -2737,
              averagePrice: 229.08,
              lastPrice: 225.92,
              priceAsOf: '2026-11-11T10:00:00Z',
              marketValue: -618343.04,
              unrealisedPnl: 8648.31,
              realisedPnl: -1200,
              tradeCount: 6,
            },
          ],
          totalUnrealisedPnl: 8648.31,
          totalRealisedPnl: -1200,
          totalMarketValue: -618343.04,
        }}
      />,
    );
    const [, row, total] = screen.getAllByRole('row');
    expect(within(row!).getByText('-2,737')).toHaveClass('text-sell');
    expect(within(row!).getByText('+8,648.31')).toHaveClass('text-buy');
    expect(within(row!).getByText('-1,200.00')).toHaveClass('text-sell');
    expect(within(total!).getByText(/MV -618,343.04/)).toBeInTheDocument();
  });

  it('has an empty state', () => {
    renderWithProviders(
      <PositionsTable
        summary={{ positions: [], totalUnrealisedPnl: 0, totalRealisedPnl: 0, totalMarketValue: 0 }}
      />,
    );
    expect(screen.getByText('No open trades in this book.')).toBeInTheDocument();
  });
});
