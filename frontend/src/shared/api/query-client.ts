import { QueryClient } from '@tanstack/react-query';

import { isApiError } from './api-error';

/** Retries only transient failures; 4xx answers are final. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        refetchOnWindowFocus: false,
        retry: (count, error) =>
          count < 2 && (!isApiError(error) || error.status === 0 || error.status >= 500),
      },
      mutations: { retry: false },
    },
  });
}
