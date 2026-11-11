import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PriceStripView } from './price-strip';

const at = '2026-11-11T10:00:00Z';

describe('PriceStripView', () => {
  it('colours each symbol by its last move and keeps it until the next move', () => {
    const { rerender } = render(
      <PriceStripView
        prices={[
          { symbol: 'AAPL', price: 227.45, asOf: at },
          { symbol: 'VOD.L', price: 0.7342, asOf: at },
        ]}
      />,
    );
    const item = (s: string) => screen.getByText(s).closest('li')!;
    expect(item('AAPL')).toHaveAttribute('data-direction', 'flat');

    rerender(
      <PriceStripView
        prices={[
          { symbol: 'AAPL', price: 228.1, asOf: at },
          { symbol: 'VOD.L', price: 0.7301, asOf: at },
        ]}
      />,
    );
    expect(item('AAPL')).toHaveAttribute('data-direction', 'up');
    expect(screen.getByText('228.10')).toHaveClass('text-buy');
    expect(item('VOD.L')).toHaveAttribute('data-direction', 'down');
    expect(screen.getByText('0.7301')).toHaveClass('text-sell');

    rerender(
      <PriceStripView
        prices={[
          { symbol: 'AAPL', price: 228.1, asOf: at },
          { symbol: 'VOD.L', price: 0.7301, asOf: at },
        ]}
      />,
    );
    expect(item('AAPL')).toHaveAttribute('data-direction', 'up');
  });
});
