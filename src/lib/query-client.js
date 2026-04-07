import { QueryClient } from "@tanstack/react-query";

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,    // 30 seconds — don't refetch on every navigation
      gcTime: 300_000,      // 5 minutes — keep unused cache alive longer
    },
  },
});
