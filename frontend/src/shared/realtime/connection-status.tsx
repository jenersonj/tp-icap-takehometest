'use client';

import { cn } from '@/shared/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

import type { ConnectionStatus as Status } from './realtime-client';
import { useRealtimeStatus } from './realtime-provider';

const LABEL: Record<Status, string> = {
  idle: 'Offline',
  connecting: 'Connecting',
  connected: 'Live',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
};

export function ConnectionStatusView({ status }: { status: Status }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="status"
            aria-label={`Realtime: ${LABEL[status]}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          />
        }
      >
        <span
          className={cn(
            'size-2 rounded-full',
            status === 'connected' && 'bg-buy',
            (status === 'connecting' || status === 'reconnecting') && 'animate-pulse bg-amber-500',
            (status === 'idle' || status === 'offline') && 'bg-sell',
          )}
        />
        {LABEL[status]}
      </TooltipTrigger>
      <TooltipContent>
        {status === 'connected'
          ? 'Receiving live trade, position and price updates'
          : 'Live updates paused; data refreshes when the connection returns'}
      </TooltipContent>
    </Tooltip>
  );
}

export function ConnectionStatus() {
  return <ConnectionStatusView status={useRealtimeStatus()} />;
}
