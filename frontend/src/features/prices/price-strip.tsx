'use client';

import { PriceEvents, type PriceDto } from '@blotter/contracts';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { useRef } from 'react';

import { api } from '@/shared/api/api-client';
import { queryKeys } from '@/shared/api/query-keys';
import { formatPrice, formatTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { useRealtimeEvent } from '@/shared/realtime/realtime-provider';
import { Skeleton } from '@/shared/ui/skeleton';

import { useThrottledInvalidate } from './use-throttled-invalidate';

export function usePrices() {
  return useQuery({ queryKey: queryKeys.prices, queryFn: () => api.get<PriceDto[]>('/prices') });
}

type Direction = -1 | 0 | 1;

/** Remembers each symbol's last move, so a price keeps its colour until it moves again. */
export function useTickDirections(prices: PriceDto[] | undefined): Map<string, Direction> {
  const state = useRef({ last: new Map<string, number>(), dir: new Map<string, Direction>() });
  const { last, dir } = state.current;
  for (const p of prices ?? []) {
    const before = last.get(p.symbol);
    if (before !== undefined && before !== p.price) dir.set(p.symbol, p.price > before ? 1 : -1);
    else if (before === undefined) dir.set(p.symbol, 0);
    last.set(p.symbol, p.price);
  }
  return dir;
}

export function PriceStripView({ prices }: { prices: PriceDto[] }) {
  const directions = useTickDirections(prices);
  return (
    <ul className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto text-xs tabular-nums [scrollbar-width:none]">
      {prices.map((p) => {
        const dir = directions.get(p.symbol) ?? 0;
        return (
          <li
            key={p.symbol}
            data-direction={dir === 1 ? 'up' : dir === -1 ? 'down' : 'flat'}
            className="flex shrink-0 items-center gap-1"
            title={`${p.symbol} as of ${formatTime(p.asOf)}`}
          >
            <span className="font-semibold">{p.symbol}</span>
            <span className={cn(dir === 1 && 'text-buy', dir === -1 && 'text-sell')}>
              {formatPrice(p.price)}
            </span>
            {dir === 1 && <ArrowUpIcon aria-label="up" className="size-3 text-buy" />}
            {dir === -1 && <ArrowDownIcon aria-label="down" className="size-3 text-sell" />}
          </li>
        );
      })}
    </ul>
  );
}

/** Live mock market prices; refetched on prices.ticked, at most once a second. */
export function PriceStrip() {
  const prices = usePrices();
  const refetch = useThrottledInvalidate(queryKeys.prices, 1000);
  useRealtimeEvent(PriceEvents.TICKED, refetch);
  return (
    <div className="flex h-8 shrink-0 items-center gap-3 border-b bg-muted/40 px-3">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Market
      </span>
      {prices.data ? <PriceStripView prices={prices.data} /> : <Skeleton className="h-4 flex-1" />}
    </div>
  );
}
