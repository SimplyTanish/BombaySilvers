import { useQuery } from "@tanstack/react-query";
import { fetchLiveRates } from "@/lib/rates";
import type { LiveRates } from "@/lib/rates";
import { isMarketOpen } from "@/lib/market";

/**
 * Fetches live gold & silver futures rates from the MCX public marketwatch
 * feed (derived from COMEX + USD/INR) via a TanStack Start server function.
 *
 * The server function has its own in-memory cache (default 30s) so multiple
 * open tabs don't multiply requests. The client hook polls at 30s while the
 * MCX session is live so prices tick in near-real-time, and drops back to a
 * quiet 5-min cadence when the market is closed.
 *
 * Usage:
 *   const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useLiveRates();
 */
export function useLiveRates() {
  return useQuery<LiveRates, Error>({
    queryKey: ["live-rates"],
    queryFn: () => fetchLiveRates(),
    // While the market is open poll every 30s (matches the server-side cache
    // TTL), otherwise check in quietly every 5 min.
    refetchInterval: () => (isMarketOpen() ? 30 * 1000 : 5 * 60 * 1000),
    staleTime: 25 * 1000,
    // Keep previous data visible while refetching so the UI never blanks out
    placeholderData: (prev) => prev,
    // One retry with a short delay so transient failures recover quickly
    retry: 1,
    retryDelay: 5_000,
  });
}
