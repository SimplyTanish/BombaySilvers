import { useQuery } from "@tanstack/react-query";
import { fetchLiveRates } from "@/lib/rates";
import type { LiveRates } from "@/lib/rates";

/**
 * Fetches live gold & silver futures rates from the MCX public marketwatch
 * feed via a TanStack Start server function.
 *
 * The server function has its own in-memory cache (default 30s) so multiple
 * open tabs don't multiply requests. This client-side hook polls at a 5-min
 * cadence so the UI always reflects the latest cached value.
 *
 * Usage:
 *   const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useLiveRates();
 */
export function useLiveRates() {
  return useQuery<LiveRates, Error>({
    queryKey: ["live-rates"],
    queryFn: () => fetchLiveRates(),
    // Poll at 5 min; the server cache means this won't hammer the MCX feed from
    // multiple tabs — only one actual marketwatch call happens per window.
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
    // Keep previous data visible while refetching so the UI never blanks out
    placeholderData: (prev) => prev,
    // One retry with a short delay so transient failures recover quickly
    retry: 1,
    retryDelay: 5_000,
  });
}
