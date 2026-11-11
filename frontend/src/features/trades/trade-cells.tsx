'use client';

import type { TradeDto } from '@blotter/contracts';
import type { CustomCellRendererProps } from 'ag-grid-react';
import { BanIcon, HistoryIcon, PencilIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

/** Callbacks the grid hands to its cells through `context`. */
export interface TradeGridContext {
  canTrade: boolean;
  onAmend: (trade: TradeDto) => void;
  onCancel: (trade: TradeDto) => void;
  onAudit: (trade: TradeDto) => void;
}

export function SideCell({ value }: CustomCellRendererProps<TradeDto, string>) {
  if (!value) return null;
  return (
    <span className={cn('font-semibold', value === 'BUY' ? 'text-buy' : 'text-sell')}>{value}</span>
  );
}

export function StatusCell({ value }: CustomCellRendererProps<TradeDto, string>) {
  if (!value) return null;
  return (
    <Badge
      variant={value === 'ACTIVE' ? 'secondary' : 'outline'}
      className={cn(value === 'CANCELLED' && 'text-muted-foreground line-through')}
    >
      {value === 'ACTIVE' ? 'Active' : 'Cancelled'}
    </Badge>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-xs" aria-label={label} onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ActionsCell({
  data,
  context,
}: CustomCellRendererProps<TradeDto, unknown, TradeGridContext>) {
  if (!data) return null;
  const writable = context.canTrade && data.status === 'ACTIVE';
  return (
    <div className="flex h-full items-center gap-0.5">
      <IconAction label={`Audit trail of ${data.tradeRef}`} onClick={() => context.onAudit(data)}>
        <HistoryIcon />
      </IconAction>
      {writable && (
        <>
          <IconAction label={`Amend ${data.tradeRef}`} onClick={() => context.onAmend(data)}>
            <PencilIcon />
          </IconAction>
          <IconAction label={`Cancel ${data.tradeRef}`} onClick={() => context.onCancel(data)}>
            <BanIcon className="text-sell" />
          </IconAction>
        </>
      )}
    </div>
  );
}
