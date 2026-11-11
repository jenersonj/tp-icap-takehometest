'use client';

import type { TradeDto } from '@blotter/contracts';
import { useMemo, useRef, useState } from 'react';

import { AuditSheet } from '@/features/audit/audit-sheet';
import { useCanTrade } from '@/features/auth/session';
import { PositionsPanel } from '@/features/positions/positions-panel';
import { BlotterGrid, type BlotterGridHandle } from '@/features/trades/blotter-grid';
import { CancelTradeDialog } from '@/features/trades/cancel-trade-dialog';
import { EMPTY_FILTERS, type TradeFilters } from '@/features/trades/trade-filters';
import { TradeFormDialog, type TradeDialogState } from '@/features/trades/trade-form-dialog';
import { TradesToolbar } from '@/features/trades/trades-toolbar';

export default function BlotterPage() {
  const canTrade = useCanTrade();
  const grid = useRef<BlotterGridHandle>(null);
  const [filters, setFilters] = useState<TradeFilters>(EMPTY_FILTERS);
  const [total, setTotal] = useState<number | null>(null);
  const [dialog, setDialog] = useState<TradeDialogState>(null);
  const [cancelling, setCancelling] = useState<TradeDto | null>(null);
  const [auditOf, setAuditOf] = useState<TradeDto | null>(null);

  const context = useMemo(
    () => ({
      canTrade,
      onAmend: (trade: TradeDto) => setDialog({ mode: 'amend', trade }),
      onCancel: setCancelling,
      onAudit: setAuditOf,
    }),
    [canTrade],
  );

  return (
    <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <section aria-label="Trades" className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TradesToolbar
          filters={filters}
          onChange={setFilters}
          onRefresh={() => grid.current?.refresh()}
          onNewTrade={canTrade ? () => setDialog({ mode: 'create' }) : undefined}
          total={total}
        />
        <div className="min-h-0 flex-1">
          <BlotterGrid ref={grid} filters={filters} context={context} onTotalChange={setTotal} />
        </div>
      </section>
      <PositionsPanel className="h-72 shrink-0 border-t lg:h-auto lg:w-[460px] lg:border-t-0 lg:border-l" />
      <TradeFormDialog state={dialog} onClose={() => setDialog(null)} />
      <CancelTradeDialog trade={cancelling} onClose={() => setCancelling(null)} />
      <AuditSheet trade={auditOf} onClose={() => setAuditOf(null)} />
    </main>
  );
}
