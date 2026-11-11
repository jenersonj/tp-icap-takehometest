'use client';

import { BOOKS, PositionEvents, PriceEvents, type PositionSummaryDto } from '@blotter/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useThrottledInvalidate } from '@/features/prices/use-throttled-invalidate';
import { api } from '@/shared/api/api-client';
import { errorMessage } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import { cn } from '@/shared/lib/utils';
import { useRealtimeEvent } from '@/shared/realtime/realtime-provider';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

import { PositionsGrid } from './positions-grid';

const ALL = '__all__';

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
      <div className="min-h-0 flex-1">
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
        {positions.data && <PositionsGrid summary={positions.data} />}
      </div>
    </section>
  );
}
