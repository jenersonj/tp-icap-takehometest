'use client';

import type { TradeDto } from '@blotter/contracts';
import { useState } from 'react';

import { errorMessage, isApiError } from '@/shared/api/api-error';
import { formatPrice, formatQty } from '@/shared/lib/format';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Field, FieldDescription, FieldLabel } from '@/shared/ui/field';
import { Spinner } from '@/shared/ui/spinner';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from 'sonner';

import { useCancelTrade } from './use-trade-mutations';

/** Cancelling is final (decision 8), so it asks first and records an optional reason. */
export function CancelTradeDialog({
  trade,
  onClose,
}: {
  trade: TradeDto | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const cancel = useCancelTrade();

  const confirm = () => {
    if (!trade) return;
    const trimmed = reason.trim();
    cancel.mutate(
      {
        id: trade.id,
        input: trimmed ? { version: trade.version, reason: trimmed } : { version: trade.version },
      },
      {
        onSuccess: () => {
          setReason('');
          onClose();
        },
        onError: (error) => {
          toast.error(
            isApiError(error) && error.isConflict
              ? `${trade.tradeRef} was changed by someone else. Check the latest version and try again.`
              : errorMessage(error),
          );
          onClose();
        },
      },
    );
  };

  return (
    <AlertDialog open={trade !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel {trade?.tradeRef}?</AlertDialogTitle>
          <AlertDialogDescription>
            {trade &&
              `${trade.side} ${formatQty(trade.quantity)} ${trade.symbol} @ ${formatPrice(trade.price)} in ${trade.book}. `}
            A cancelled trade cannot be amended or reinstated.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="cancel-reason">Reason</FieldLabel>
          <Textarea
            id="cancel-reason"
            value={reason}
            maxLength={200}
            placeholder="e.g. booked in the wrong book"
            onChange={(e) => setReason(e.target.value)}
          />
          <FieldDescription>Optional, kept in the audit trail.</FieldDescription>
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancel.isPending}>Keep trade</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirm} disabled={cancel.isPending}>
            {cancel.isPending && <Spinner />}
            Cancel trade
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
