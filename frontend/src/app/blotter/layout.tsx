import type { ReactNode } from 'react';

import { AuthGuard } from '@/features/auth/auth-guard';
import { PriceStrip } from '@/features/prices/price-strip';

import { AppHeader } from './app-header';

export default function BlotterLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-svh flex-col overflow-hidden">
        <AppHeader />
        <PriceStrip />
        {children}
      </div>
    </AuthGuard>
  );
}
