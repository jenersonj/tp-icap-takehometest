'use client';

import type { AuditEntryDto, TradeDto } from '@blotter/contracts';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon } from 'lucide-react';

import { api } from '@/shared/api/api-client';
import { errorMessage } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import { formatDateTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Skeleton } from '@/shared/ui/skeleton';

const ACTION_STYLE: Record<AuditEntryDto['action'], string> = {
  CREATED: 'bg-buy/15 text-buy',
  AMENDED: 'bg-chart-4/20 text-foreground',
  CANCELLED: 'bg-sell/15 text-sell',
};

function show(value: string | number | null): string {
  if (value === null || value === '') return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
  return String(value);
}

export function AuditTrail({ entries }: { entries: AuditEntryDto[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {[...entries].reverse().map((entry) => (
        <li key={entry.id} className="rounded-lg border p-3 text-xs">
          <div className="mb-2 flex items-center gap-2">
            <Badge className={cn('border-transparent', ACTION_STYLE[entry.action])}>
              {entry.action}
            </Badge>
            <span className="text-muted-foreground">v{entry.version}</span>
            <span className="ml-auto text-muted-foreground tabular-nums">
              {formatDateTime(entry.at)}
            </span>
          </div>
          <p className="mb-2 text-muted-foreground">
            by <span className="font-medium text-foreground">{entry.actor}</span>
            {entry.reason && <> · “{entry.reason}”</>}
          </p>
          {entry.changes.length > 0 && (
            <table className="w-full tabular-nums">
              <tbody>
                {entry.changes.map((c) => (
                  <tr key={c.field} className="border-t first:border-t-0">
                    <td className="py-1 pr-2 text-muted-foreground">{c.field}</td>
                    {entry.action !== 'CREATED' && (
                      <td className="py-1 pr-1 text-right text-muted-foreground line-through">
                        {show(c.from)}
                      </td>
                    )}
                    {entry.action !== 'CREATED' && (
                      <td className="w-4 text-muted-foreground">
                        <ArrowRightIcon className="size-3" />
                      </td>
                    )}
                    <td className="py-1 text-right font-medium">{show(c.to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Per-trade audit trail, newest first; refetched when that trade changes (see BlotterGrid). */
export function AuditSheet({ trade, onClose }: { trade: TradeDto | null; onClose: () => void }) {
  const audit = useQuery({
    queryKey: queryKeys.audit(trade?.id ?? ''),
    queryFn: () => api.get<AuditEntryDto[]>(`/trades/${trade!.id}/audit`),
    enabled: trade !== null,
  });
  return (
    <Sheet open={trade !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Audit trail · {trade?.tradeRef}</SheetTitle>
          <SheetDescription>
            {trade && `${trade.side} ${trade.symbol} in ${trade.book}. Every change, newest first.`}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          {audit.isPending && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          )}
          {audit.isError && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage(audit.error)}</AlertDescription>
            </Alert>
          )}
          {audit.data && <AuditTrail entries={audit.data} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
