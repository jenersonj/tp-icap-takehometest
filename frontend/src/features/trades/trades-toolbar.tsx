'use client';

import { BOOKS } from '@blotter/contracts';
import { FilterXIcon, PlusIcon, RefreshCwIcon, SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { formatQty } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Separator } from '@/shared/ui/separator';

import { activeFilterCount, EMPTY_FILTERS, type TradeFilters } from './trade-filters';

const ALL = '__all__';

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  width = 'w-32',
}: {
  label: string;
  value: string | undefined;
  options: readonly { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
  width?: string;
}) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(v) => onChange(v === ALL || !v ? undefined : String(v))}
    >
      <SelectTrigger size="sm" className={width} aria-label={label}>
        <SelectValue>
          {(v: string) =>
            v === ALL
              ? `All ${label.toLowerCase()}`
              : (options.find((o) => o.value === v)?.label ?? v)
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SearchInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const [text, setText] = useState(value ?? '');
  const debounced = useDebounced(text, 300);
  useEffect(() => setText(value ?? ''), [value]);
  useEffect(() => {
    const next = debounced.trim() || undefined;
    if (next !== value) onChange(next);
  }, [debounced]);
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label={label}
        placeholder={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-7 w-32 pl-7 text-xs"
      />
    </div>
  );
}

export function TradesToolbar({
  filters,
  onChange,
  onRefresh,
  onNewTrade,
  total,
}: {
  filters: TradeFilters;
  onChange: (filters: TradeFilters) => void;
  onRefresh: () => void;
  onNewTrade?: () => void;
  total: number | null;
}) {
  const set = (patch: Partial<TradeFilters>) => onChange({ ...filters, ...patch });
  const changed = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <FilterSelect
        label="Statuses"
        value={filters.status}
        options={[
          { value: 'ACTIVE', label: 'Active' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ]}
        onChange={(v) => set({ status: v as TradeFilters['status'] })}
        width="w-28"
      />
      <FilterSelect
        label="Sides"
        value={filters.side}
        options={[
          { value: 'BUY', label: 'Buy' },
          { value: 'SELL', label: 'Sell' },
        ]}
        onChange={(v) => set({ side: v as TradeFilters['side'] })}
        width="w-24"
      />
      <FilterSelect
        label="Books"
        value={filters.book}
        options={BOOKS.map((b) => ({ value: b, label: b }))}
        onChange={(v) => set({ book: v })}
        width="w-36"
      />
      <SearchInput label="Symbol" value={filters.symbol} onChange={(v) => set({ symbol: v })} />
      <SearchInput label="Trader" value={filters.trader} onChange={(v) => set({ trader: v })} />
      <SearchInput
        label="Counterparty"
        value={filters.counterparty}
        onChange={(v) => set({ counterparty: v })}
      />
      {changed && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
          <FilterXIcon /> Reset
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {total === null ? '' : `${formatQty(total)} trades`}
          {activeFilterCount(filters) > 0 && total !== null ? ' (filtered)' : ''}
        </span>
        <Separator orientation="vertical" className="h-5" />
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCwIcon /> Refresh
        </Button>
        {onNewTrade && (
          <Button size="sm" onClick={onNewTrade}>
            <PlusIcon /> New trade
          </Button>
        )}
      </div>
    </div>
  );
}
