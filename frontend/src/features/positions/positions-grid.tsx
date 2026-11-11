'use client';

import type { PositionDto, PositionSummaryDto } from '@blotter/contracts';
import { type CellClassParams, type ColDef, type ValueFormatterParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useMemo } from 'react';

import { defaultColDef, gridContainerClass, gridTheme } from '@/shared/grid/data-grid';
import { formatMoney, formatPrice, formatQty, signOf } from '@/shared/lib/format';

/** The pinned bottom row: a PositionDto-shaped total. */
export type PositionRow = PositionDto & { isTotal?: boolean };

/** Green for positive, red for negative, nothing for zero or no value. */
export function signClass(value: number | null | undefined): string {
  const sign = signOf(value);
  return sign > 0 ? 'text-buy' : sign < 0 ? 'text-sell' : '';
}

export function totalRow(summary: PositionSummaryDto): PositionRow {
  return {
    isTotal: true,
    symbol: 'Total',
    netQuantity: 0,
    averagePrice: null,
    lastPrice: null,
    priceAsOf: null,
    marketValue: summary.totalMarketValue,
    unrealisedPnl: summary.totalUnrealisedPnl,
    realisedPnl: summary.totalRealisedPnl,
    tradeCount: summary.positions.reduce((n, p) => n + p.tradeCount, 0),
  };
}

const fmt =
  (f: (v: number) => string, onTotal = true) =>
  (p: ValueFormatterParams<PositionRow, number | null>) =>
    (p.data?.isTotal && !onTotal) || p.value === null || p.value === undefined ? '' : f(p.value);
const colour = (p: CellClassParams<PositionRow, number | null>) => signClass(p.value);

export const positionColumns: ColDef<PositionRow>[] = [
  { field: 'symbol', pinned: 'left', width: 80, cellClass: 'font-semibold' },
  {
    field: 'netQuantity',
    headerName: 'Net qty',
    flex: 1,
    minWidth: 85,
    type: 'rightAligned',
    valueFormatter: fmt(formatQty, false),
    cellClass: colour,
  },
  {
    field: 'averagePrice',
    headerName: 'Avg px',
    flex: 1,
    minWidth: 95,
    type: 'rightAligned',
    valueFormatter: fmt(formatPrice),
  },
  {
    field: 'lastPrice',
    headerName: 'Last',
    flex: 1,
    minWidth: 75,
    type: 'rightAligned',
    valueFormatter: fmt(formatPrice),
    enableCellChangeFlash: true,
  },
  {
    field: 'unrealisedPnl',
    headerName: 'Unrl P&L',
    flex: 1,
    minWidth: 100,
    type: 'rightAligned',
    valueFormatter: fmt((v) => formatMoney(v, { signed: true })),
    cellClass: colour,
    enableCellChangeFlash: true,
  },
  {
    field: 'realisedPnl',
    headerName: 'Rlzd P&L',
    flex: 1,
    minWidth: 100,
    type: 'rightAligned',
    valueFormatter: fmt((v) => formatMoney(v, { signed: true })),
    cellClass: colour,
  },
  {
    field: 'marketValue',
    headerName: 'Mkt value',
    flex: 1,
    minWidth: 115,
    type: 'rightAligned',
    valueFormatter: fmt((v) => formatMoney(v)),
  },
  {
    field: 'tradeCount',
    headerName: 'Trades',
    flex: 1,
    minWidth: 65,
    type: 'rightAligned',
  },
];

/**
 * Positions in the same AG Grid look as the blotter: fixed header, sortable columns, a
 * pinned totals row, and price and P&L cells that flash when a tick changes them.
 */
export function PositionsGrid({ summary }: { summary: PositionSummaryDto }) {
  const pinned = useMemo(() => [totalRow(summary)], [summary]);
  return (
    <div className={gridContainerClass}>
      <AgGridReact<PositionRow>
        theme={gridTheme}
        rowData={summary.positions}
        pinnedBottomRowData={pinned}
        columnDefs={positionColumns}
        defaultColDef={defaultColDef}
        getRowId={(p) => (p.data.isTotal ? '__total__' : p.data.symbol)}
        getRowClass={(p) => (p.data?.isTotal ? 'font-semibold' : undefined)}
        suppressCellFocus
        overlayNoRowsTemplate="No open trades in this book"
      />
    </div>
  );
}
