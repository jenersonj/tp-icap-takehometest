'use client';

import { CandlestickChartIcon } from 'lucide-react';

import { UserMenu } from '@/features/auth/user-menu';
import { ThemeToggle } from '@/shared/components/theme-toggle';
import { ConnectionStatus } from '@/shared/realtime/connection-status';
import { Separator } from '@/shared/ui/separator';

export function AppHeader() {
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b px-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CandlestickChartIcon className="size-4" />
        Trade Blotter
      </div>
      <div className="ml-auto flex items-center gap-3">
        <ConnectionStatus />
        <Separator orientation="vertical" className="h-5" />
        <UserMenu />
        <ThemeToggle />
      </div>
    </header>
  );
}
