'use client';

import type {
  AmendTradeInput,
  CancelTradeInput,
  CreateTradeInput,
  TradeDto,
} from '@blotter/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/shared/api/query-keys';

import { tradesApi } from './trades-api';

/**
 * Trade writes. The grid refreshes from the realtime event; the caches for that trade
 * (detail, audit) and positions are invalidated here too so the UI updates without it.
 */
function useAfterWrite() {
  const queryClient = useQueryClient();
  return (trade: TradeDto) => {
    queryClient.setQueryData(queryKeys.trade(trade.id), trade);
    void queryClient.invalidateQueries({ queryKey: queryKeys.audit(trade.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.allPositions });
  };
}

export function useCreateTrade() {
  const after = useAfterWrite();
  return useMutation({
    mutationFn: (input: CreateTradeInput) => tradesApi.create(input),
    onSuccess: (trade) => {
      after(trade);
      toast.success(`Booked ${trade.tradeRef}`, {
        description: `${trade.side} ${trade.quantity.toLocaleString('en-GB')} ${trade.symbol} @ ${trade.price}`,
      });
    },
  });
}

export function useAmendTrade() {
  const after = useAfterWrite();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AmendTradeInput }) =>
      tradesApi.amend(id, input),
    onSuccess: (trade) => {
      after(trade);
      toast.success(`Amended ${trade.tradeRef}`, {
        description: `Now at version ${trade.version}`,
      });
    },
  });
}

export function useCancelTrade() {
  const after = useAfterWrite();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CancelTradeInput }) =>
      tradesApi.cancel(id, input),
    onSuccess: (trade) => {
      after(trade);
      toast.success(`Cancelled ${trade.tradeRef}`);
    },
  });
}
