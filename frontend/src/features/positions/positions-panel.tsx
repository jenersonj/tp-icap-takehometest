'use client';

import { BOOKS, PositionEvents, PriceEvents, type PositionSummaryDto } from '@blotter/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useThrottledInvalidate } from '@/features/prices/use-throttled-invalidate';
import { api } from '@/shared/api/api-client';
import { errorMessage } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import { formatMoney, formatPrice, formatQty, signOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { useRealtimeEvent } from '@/shared/realtime/realtime-provider';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

const ALL = '__all__';

function Pnl({ value, className }: { value: number | null; className?: string }) {
  const sign = signOf(value);
  return (
    <span className={cn(sign > 0 && 'text-buy', sign < 0 && 'text-sell', className)}>
      {formatMoney(value, { signed: true })}
    </span>
  );
}

export function PositionsTable({ summary }: { summary: PositionSummaryDto }) {
  if (summary.positions.length === 0) {
    return (
      <p className="p-4 text-center text-xs text-muted-foreground">No open trades in this book.</p>
    );
  }
  return (
    <Table className="text-xs tabular-nums">
      <TableHeader className="sticky top-0 bg-background">
        <TableRow>
          <TableHead className="h-7">Symbol</TableHead>
          <TableHead className="h-7 text-right">Net qty</TableHead>
          <TableHead className="h-7 text-right">Avg px</TableHead>
          <TableHead className="h-7 text-right">Last</TableHead>
          <TableHead className="h-7 text-right">Unrl P&amp;L</TableHead>
          <TableHead className="h-7 text-right">Rlzd P&amp;L</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {summary.positions.map((p) => (
          <TableRow key={p.symbol}>
            <TableCell className="py-1 font-semibold">{p.symbol}</TableCell>
            <TableCell
              className={cn(
                'py-1 text-right',
                p.netQuantity > 0 && 'text-buy',
                p.netQuantity < 0 && 'text-sell',
              )}
            >
              {formatQty(p.netQuantity)}
            </TableCell>
            <TableCell className="py-1 text-right">{formatPrice(p.averagePrice)}</TableCell>
            <TableCell className="py-1 text-right">{formatPrice(p.lastPrice)}</TableCell>
            <TableCell className="py-1 text-right">
              <Pnl value={p.unrealisedPnl} />
            </TableCell>
            <TableCell className="py-1 text-right">
              <Pnl value={p.realisedPnl} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter className="sticky bottom-0">
        <TableRow>
          <TableCell className="py-1 font-semibold" colSpan={4}>
            Total · MV {formatMoney(summary.totalMarketValue)}
          </TableCell>
          <TableCell className="py-1 text-right font-semibold">
            <Pnl value={summary.totalUnrealisedPnl} />
          </TableCell>
          <TableCell className="py-1 text-right font-semibold">
            <Pnl value={summary.totalRealisedPnl} />
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

/**
 * Net position and P&L by symbol (computed by the service per request). Refetched when a
 * trade moves a position and, throttled to once a second, on every price tick.
 */
export function PositionsPanel({ className }: { className?: string }) {
  const [book, setBook] = useState<string | undefined>();
  const positions = useQuery({
    queryKey: queryKeys.positions(book),
    queryFn: () => api.get<PositionSummaryDto>('/positions', { book }),
    placeholderData: keepPreviousData,
  });
  const refetch = useThrottledInvalidate(queryKeys.allPositions, 1000);
  useRealtimeEvent(PositionEvents.CHANGED, refetch);
  useRealtimeEvent(PriceEvents.TICKED, refetch);

  return (
    <section aria-label="Positions" className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <h2 className="text-sm font-semibold">Positions &amp; P&amp;L</h2>
        <div className="ml-auto">
          <Select
            value={book ?? ALL}
            onValueChange={(v) => setBook(v === ALL || !v ? undefined : String(v))}
          >
            <SelectTrigger size="sm" className="w-36" aria-label="Book">
              <SelectValue>{(v: string) => (v === ALL ? 'All books' : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All books</SelectItem>
              {BOOKS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {positions.isPending && (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-5" />
            ))}
          </div>
        )}
        {positions.isError && (
          <Alert variant="destructive" className="m-3 w-auto">
            <AlertDescription>{errorMessage(positions.error)}</AlertDescription>
          </Alert>
        )}
        {positions.data && <PositionsTable summary={positions.data} />}
      </div>
    </section>
  );
}
