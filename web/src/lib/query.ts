import {
  CancelledError,
  MutationCache,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';

import { isApiError } from './clients';

function handleError(error: unknown) {
  if (error instanceof CancelledError) return; // never show a toast for these

  if (isApiError(error)) {
    if (error.isUnauthorized) {
      // e.g. redirect to login or refresh the session
      return;
    }

    if (error.isNetwork) {
      // toast.error('Check your connection')
      return;
    }
    // toast.error(error.message)
    return;
  }

  // Unexpected: a real bug, so log it and show a generic message
  console.error(error);
  // toast.error('Something went wrong')
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      retry: (count, error) => {
        if (error instanceof CancelledError) return false;
        if (!isApiError(error)) return false;
        // Retry network failures and 5xx, never 4xx
        return (error.isNetwork || error.isServerError) && count < 2;
      },
    },
  },
});
