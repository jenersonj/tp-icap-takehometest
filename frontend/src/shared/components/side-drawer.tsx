'use client';

import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/utils';
import { SheetContent } from '@/shared/ui/sheet';

/**
 * The right-hand drawer used for trade details (audit trail, create and amend): one width
 * and layout, with the header and footer fixed and the body scrolling.
 */
export function SideDrawerContent({ className, ...props }: ComponentProps<typeof SheetContent>) {
  return (
    <SheetContent
      side="right"
      className={cn('flex w-full flex-col gap-0 sm:max-w-md', className)}
      {...props}
    />
  );
}

/** Scrolling middle section between a SheetHeader and a SheetFooter. */
export function SideDrawerBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 pb-4', className)} {...props} />;
}
