'use client';

import {
  TRADE_SORT_FIELDS,
  TradeEvents,
  type TradeDto,
  type TradeSortField,
} from '@blotter/contracts';
import { useQueryClient } from '@tanstack/react-query';
import {
  type ColDef,
  type GetRowIdParams,
  type GridApi,
  type IDatasource,
  type IGetRowsParams,
  type ValueFormatterParams,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import { defaultColDef, gridContainerClass, gridTheme } from '@/shared/grid/data-grid';
import { formatDateTime, formatMoney, formatPrice, formatQty } from '@/shared/lib/format';
import { throttle } from '@/shared/lib/throttle';
import { useRealtimeEvent } from '@/shared/realtime/realtime-provider';

import { ActionsCell, SideCell, StatusCell, type TradeGridContext } from './trade-cells';
import type { TradeFilters } from './trade-filters';
import { tradesApi } from './trades-api';

export const PAGE_SIZE = 100;
const SORTABLE = new Set<string>(TRADE_SORT_FIELDS);

export interface BlotterGridHandle {
  refresh: () => void;
}

/** The `sort` query parameter for an AG Grid sort model (`-field` = descending). */
export function toSortParam(sortModel: IGetRowsParams['sortModel']): string {
  const first = sortModel.find((s) => SORTABLE.has(s.colId));
  if (!first) return '-tradeTimestamp';
  return `${first.sort === 'desc' ? '-' : ''}${first.colId as TradeSortField}`;
}

/** Block row range -> 1-based page (blocks are exactly one page). */
export function toPage(startRow: number, pageSize = PAGE_SIZE): number {
  return Math.floor(startRow / pageSize) + 1;
}

const num = (f: (v: number) => string) => (p: ValueFormatterParams<TradeDto, number>) =>
  p.value === null || p.value === undefined ? '' : f(p.value);

/**
 * The trade grid: AG Grid Community's infinite row model, so paging, sorting and
 * filtering run on the server (decision 5) and only the visible blocks are in memory; rows
 * are virtualised. Trade events refresh the loaded blocks and flash the changed row.
 */
export const BlotterGrid = forwardRef<
  BlotterGridHandle,
  {
    filters: TradeFilters;
    context: TradeGridContext;
    onTotalChange?: (total: number | null) => void;
  }
>(function BlotterGrid({ filters, context, onTotalChange }, ref) {
  const apiRef = useRef<GridApi<TradeDto> | null>(null);
  const flashIds = useRef(new Set<string>());
  const queryClient = useQueryClient();
  const onTotalRef = useRef(onTotalChange);
  onTotalRef.current = onTotalChange;

  const columns = useMemo<ColDef<TradeDto>[]>(
    () => [
      { field: 'tradeRef', headerName: 'Ref', width: 100, pinned: 'left', cellClass: 'font-mono' },
      {
        field: 'tradeTimestamp',
        headerName: 'Trade time',
        width: 150,
        sort: 'desc',
        valueFormatter: (p) => formatDateTime(p.value),
      },
      { field: 'symbol', width: 80, cellClass: 'font-semibold' },
      { field: 'side', width: 60, cellRenderer: SideCell },
      {
        field: 'quantity',
        headerName: 'Qty',
        width: 90,
        type: 'rightAligned',
        valueFormatter: num(formatQty),
      },
      { field: 'price', width: 90, type: 'rightAligned', valueFormatter: num(formatPrice) },
      {
        field: 'notional',
        width: 115,
        type: 'rightAligned',
        sortable: false,
        valueFormatter: num((v) => formatMoney(v)),
      },
      { field: 'trader', width: 85 },
      { field: 'book', width: 120 },
      { field: 'counterparty', flex: 1, minWidth: 120 },
      { field: 'status', width: 95, cellRenderer: StatusCell },
      { field: 'version', headerName: 'v', width: 45, type: 'rightAligned', sortable: false },
      {
        colId: 'actions',
        headerName: '',
        width: context.canTrade ? 96 : 44,
        pinned: 'right',
        sortable: false,
        resizable: false,
        cellRenderer: ActionsCell,
      },
    ],
    [context.canTrade],
  );

  const datasource = useMemo<IDatasource>(
    () => ({
      getRows: (params) => {
        tradesApi
          .list({
            ...filters,
            sort: toSortParam(params.sortModel),
            page: toPage(params.startRow),
            pageSize: PAGE_SIZE,
          })
          .then(
            (page) => {
              params.successCallback(page.items, page.total);
              onTotalRef.current?.(page.total);
              flashPending();
            },
            (error: unknown) => {
              params.failCallback();
              toast.error('Could not load trades', { description: errorMessage(error) });
            },
          );
      },
    }),
    [JSON.stringify(filters)],
  );

  function flashPending() {
    const api = apiRef.current;
    if (!api || flashIds.current.size === 0) return;
    const rowNodes = [...flashIds.current]
      .map((id) => api.getRowNode(id))
      .filter((n): n is NonNullable<typeof n> => Boolean(n));
    flashIds.current.clear();
    if (rowNodes.length) api.flashCells({ rowNodes, flashDuration: 700, fadeDuration: 900 });
  }

  const refresh = useMemo(() => throttle(() => apiRef.current?.refreshInfiniteCache(), 300), []);
  useEffect(() => () => refresh.cancel(), [refresh]);
  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const onTradeEvent = useCallback(
    ({ id }: { id: string }) => {
      flashIds.current.add(id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.trade(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.audit(id) });
      refresh();
    },
    [queryClient, refresh],
  );
  useRealtimeEvent(TradeEvents.CREATED, onTradeEvent);
  useRealtimeEvent(TradeEvents.UPDATED, onTradeEvent);
  useRealtimeEvent(TradeEvents.CANCELLED, onTradeEvent);

  return (
    <div className={gridContainerClass}>
      <AgGridReact<TradeDto>
        theme={gridTheme}
        rowModelType="infinite"
        datasource={datasource}
        cacheBlockSize={PAGE_SIZE}
        maxBlocksInCache={20}
        infiniteInitialRowCount={PAGE_SIZE}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        getRowId={(p: GetRowIdParams<TradeDto>) => p.data.id}
        context={context}
        onGridReady={(e) => {
          apiRef.current = e.api;
        }}
        onRowDoubleClicked={(e) => e.data && context.onAudit(e.data)}
        rowClassRules={{ 'opacity-60': (p) => p.data?.status === 'CANCELLED' }}
        suppressCellFocus
        overlayNoRowsTemplate="No trades match these filters"
        loadingOverlayComponentParams={{}}
      />
    </div>
  );
});
