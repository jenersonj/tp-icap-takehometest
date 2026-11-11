import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuditTrail } from './audit-sheet';

describe('AuditTrail', () => {
  it('lists changes newest first with from -> to values', () => {
    render(
      <AuditTrail
        entries={[
          {
            id: 'a1',
            action: 'CREATED',
            version: 1,
            actor: 'JSMITH',
            reason: null,
            at: '2026-11-11T09:00:00Z',
            changes: [{ field: 'quantity', from: null, to: 100 }],
          },
          {
            id: 'a2',
            action: 'CANCELLED',
            version: 2,
            actor: 'ABROWN',
            reason: 'fat finger',
            at: '2026-11-11T09:05:00Z',
            changes: [{ field: 'status', from: 'ACTIVE', to: 'CANCELLED' }],
          },
        ]}
      />,
    );
    const [first, second] = screen.getAllByRole('listitem');
    expect(
      within(first!).getByText('CANCELLED', { selector: '[data-slot=badge]' }),
    ).toBeInTheDocument();
    expect(within(first!).getByText(/fat finger/)).toBeInTheDocument();
    expect(within(first!).getByText('ACTIVE')).toHaveClass('line-through');
    expect(within(second!).getByText('CREATED')).toBeInTheDocument();
    expect(within(second!).getByText('100')).toBeInTheDocument();
  });
});
