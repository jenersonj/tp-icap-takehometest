'use client';

import type { TradeDto } from '@blotter/contracts';
import { useMemo, useRef, useState } from 'react';

import { AuditSheet } from '@/features/audit/audit-sheet';
import { useCanTrade } from '@/features/auth/session';
import { PositionsPanel } from '@/features/positions/positions-panel';
import { BlotterGrid, type BlotterGridHandle } from '@/features/trades/blotter-grid';
import { CancelTradeDialog } from '@/features/trades/cancel-trade-dialog';
import { EMPTY_FILTERS, type TradeFilters } from '@/features/trades/trade-filters';
import { TradeFormSheet, type TradeDialogState } from '@/features/trades/trade-form-sheet';
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
    <main className="flex min-h-0 flex-1 flex-col min-[1700px]:flex-row">
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
      <PositionsPanel className="h-64 shrink-0 border-t min-[1700px]:h-auto min-[1700px]:w-[560px] min-[1700px]:border-t-0 min-[1700px]:border-l" />
      <TradeFormSheet state={dialog} onClose={() => setDialog(null)} />
      <CancelTradeDialog trade={cancelling} onClose={() => setCancelling(null)} />
      <AuditSheet trade={auditOf} onClose={() => setAuditOf(null)} />
    </main>
  );
}
