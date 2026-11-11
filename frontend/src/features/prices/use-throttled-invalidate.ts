'use client';

import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { throttle } from '@/shared/lib/throttle';

/** Invalidates `queryKey` at most once per `ms`, for high-frequency events like price ticks. */
export function useThrottledInvalidate(queryKey: QueryKey, ms = 1000): () => void {
  const queryClient = useQueryClient();
  const key = JSON.stringify(queryKey);
  const invalidate = useMemo(
    () =>
      throttle(
        () => void queryClient.invalidateQueries({ queryKey: JSON.parse(key) as QueryKey }),
        ms,
      ),
    [queryClient, key, ms],
  );
  useEffect(() => () => invalidate.cancel(), [invalidate]);
  return invalidate;
}
