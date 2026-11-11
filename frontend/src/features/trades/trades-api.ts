import type {
  AmendTradeInput,
  CancelTradeInput,
  CreateTradeInput,
  ListTradesQueryInput,
  TradeDto,
  TradePageDto,
} from '@blotter/contracts';

import { api } from '@/shared/api/api-client';

export const tradesApi = {
  list: (query: ListTradesQueryInput, signal?: AbortSignal) =>
    api.get<TradePageDto>('/trades', query as Record<string, string | number | undefined>, signal),
  get: (id: string) => api.get<TradeDto>(`/trades/${id}`),
  create: (input: CreateTradeInput) => api.post<TradeDto>('/trades', input),
  amend: (id: string, input: AmendTradeInput) => api.patch<TradeDto>(`/trades/${id}`, input),
  cancel: (id: string, input: CancelTradeInput) =>
    api.post<TradeDto>(`/trades/${id}/cancel`, input),
};
