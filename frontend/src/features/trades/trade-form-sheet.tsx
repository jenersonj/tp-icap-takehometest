'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { COUNTERPARTIES, SYMBOLS, type TradeDto } from '@blotter/contracts';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';

import { useCurrentUser } from '@/features/auth/session';
import { errorMessage, isApiError } from '@/shared/api/api-error';
import { SideDrawerBody, SideDrawerContent } from '@/shared/components/side-drawer';
import { cn } from '@/shared/lib/utils';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Spinner } from '@/shared/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group';

import {
  diffChanges,
  formDefaults,
  toCreateInput,
  TradeFormSchema,
  type TradeFormInput,
  type TradeFormValues,
} from './trade-form-schema';
import { tradesApi } from './trades-api';
import { useAmendTrade, useCreateTrade } from './use-trade-mutations';

export type TradeDialogState = { mode: 'create' } | { mode: 'amend'; trade: TradeDto } | null;

/**
 * Create or amend a trade in the right-hand drawer (same as the audit trail). Amend sends
 * only the changed fields plus the version it started from.
 */
export function TradeFormSheet({
  state,
  onClose,
}: {
  state: TradeDialogState;
  onClose: () => void;
}) {
  return (
    <Sheet open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <SideDrawerContent>
        {state && (
          <TradeForm
            key={state.mode === 'amend' ? state.trade.id : 'create'}
            initial={state.mode === 'amend' ? state.trade : undefined}
            onDone={onClose}
          />
        )}
      </SideDrawerContent>
    </Sheet>
  );
}

const FIELD_NAMES = new Set([
  'symbol',
  'side',
  'quantity',
  'price',
  'trader',
  'book',
  'counterparty',
  'tradeTimestamp',
]);

export function TradeForm({ initial, onDone }: { initial?: TradeDto; onDone: () => void }) {
  const user = useCurrentUser();
  const [trade, setTrade] = useState(initial);
  const [conflict, setConflict] = useState(false);
  const create = useCreateTrade();
  const amend = useAmendTrade();
  const pending = create.isPending || amend.isPending;

  const form = useForm<TradeFormInput, unknown, TradeFormValues>({
    resolver: zodResolver(TradeFormSchema),
    defaultValues: formDefaults(initial, user),
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (trade && trade !== initial) form.reset(formDefaults(trade, user));
  }, [trade, initial, form, user]);

  const showServerError = (error: unknown) => {
    if (isApiError(error) && error.isConflict) {
      setConflict(true);
      return;
    }
    if (isApiError(error) && error.details.length > 0) {
      for (const issue of error.details) {
        const field = issue.path.replace(/^(input|changes)\./, '');
        if (FIELD_NAMES.has(field)) {
          form.setError(field as FieldPath<TradeFormInput>, { message: issue.message });
        }
      }
    }
    form.setError('root', { message: errorMessage(error) });
  };

  const onSubmit = (values: TradeFormValues) => {
    if (!trade) {
      create.mutate(toCreateInput(values), { onSuccess: onDone, onError: showServerError });
      return;
    }
    const changes = diffChanges(trade, values);
    if (Object.keys(changes).length === 0) {
      form.setError('root', { message: 'Nothing changed' });
      return;
    }
    amend.mutate(
      { id: trade.id, input: { version: trade.version, changes } },
      { onSuccess: onDone, onError: showServerError },
    );
  };

  const reload = async () => {
    if (!trade) return;
    try {
      setTrade(await tradesApi.get(trade.id));
      setConflict(false);
      form.clearErrors();
    } catch (error) {
      form.setError('root', { message: errorMessage(error) });
    }
  };

  const books =
    trade && !user.books.includes(trade.book) ? [trade.book, ...user.books] : user.books;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SheetHeader>
        <SheetTitle>{trade ? `Amend ${trade.tradeRef}` : 'New trade'}</SheetTitle>
        <SheetDescription>
          {trade
            ? `Version ${trade.version}. Only changed fields are sent.`
            : 'Book a new equity trade. Leave the trade time empty to use now.'}
        </SheetDescription>
      </SheetHeader>

      <SideDrawerBody className="flex flex-col gap-4">
        {conflict && (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>This trade was changed by someone else</AlertTitle>
            <AlertDescription>
              Reload it to see the latest version, then amend again.
            </AlertDescription>
            <AlertAction>
              <Button type="button" size="sm" variant="outline" onClick={() => void reload()}>
                <RefreshCwIcon /> Reload
              </Button>
            </AlertAction>
          </Alert>
        )}
        {errors.root && !conflict && (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}

        <FieldGroup className="grid grid-cols-2 gap-3">
          <Field data-invalid={Boolean(errors.side)} className="col-span-2">
            <FieldLabel>Side</FieldLabel>
            <Controller
              control={form.control}
              name="side"
              render={({ field }) => (
                <ToggleGroup
                  value={[field.value]}
                  onValueChange={(v: string[]) => v[0] && field.onChange(v[0])}
                  variant="outline"
                  className="w-full"
                >
                  <ToggleGroupItem
                    value="BUY"
                    className="flex-1 data-[pressed]:bg-buy data-[pressed]:text-white"
                  >
                    Buy
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="SELL"
                    className="flex-1 data-[pressed]:bg-sell data-[pressed]:text-white"
                  >
                    Sell
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            />
          </Field>

          <SelectField form={form} name="symbol" label="Symbol" options={SYMBOLS} />
          <Field data-invalid={Boolean(errors.quantity)}>
            <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
            <Input
              id="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              className="tabular-nums"
              aria-invalid={Boolean(errors.quantity)}
              {...form.register('quantity', { valueAsNumber: true })}
            />
            <FieldError errors={[errors.quantity]} />
          </Field>
          <Field data-invalid={Boolean(errors.price)}>
            <FieldLabel htmlFor="price">Price</FieldLabel>
            <Input
              id="price"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              className="tabular-nums"
              aria-invalid={Boolean(errors.price)}
              {...form.register('price', { valueAsNumber: true })}
            />
            <FieldError errors={[errors.price]} />
          </Field>
          <Field data-invalid={Boolean(errors.trader)}>
            <FieldLabel htmlFor="trader">Trader</FieldLabel>
            <Input
              id="trader"
              className="uppercase"
              aria-invalid={Boolean(errors.trader)}
              {...form.register('trader')}
            />
            <FieldError errors={[errors.trader]} />
          </Field>
          <SelectField form={form} name="book" label="Book" options={books} />
          <SelectField
            form={form}
            name="counterparty"
            label="Counterparty"
            options={COUNTERPARTIES}
          />
          <Field data-invalid={Boolean(errors.tradeTimestamp)} className="col-span-2">
            <FieldLabel htmlFor="tradeTimestamp">Trade time</FieldLabel>
            <Input
              id="tradeTimestamp"
              type="datetime-local"
              step={1}
              aria-invalid={Boolean(errors.tradeTimestamp)}
              {...form.register('tradeTimestamp')}
            />
            <FieldError errors={[errors.tradeTimestamp]} />
          </Field>
        </FieldGroup>
      </SideDrawerBody>

      <SheetFooter className="flex-row justify-end border-t">
        <Button type="button" variant="outline" onClick={onDone}>
          Close
        </Button>
        <Button type="submit" disabled={pending || conflict}>
          {pending && <Spinner />}
          {trade ? 'Amend trade' : 'Book trade'}
        </Button>
      </SheetFooter>
    </form>
  );
}

function SelectField({
  form,
  name,
  label,
  options,
}: {
  form: ReturnType<typeof useForm<TradeFormInput, unknown, TradeFormValues>>;
  name: 'symbol' | 'book' | 'counterparty';
  label: string;
  options: readonly string[];
}) {
  const error = form.formState.errors[name];
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Select value={field.value || null} onValueChange={(v) => field.onChange(v ?? '')}>
            <SelectTrigger
              id={name}
              className={cn('w-full', !field.value && 'text-muted-foreground')}
              aria-invalid={Boolean(error)}
            >
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError errors={[error]} />
    </Field>
  );
}
