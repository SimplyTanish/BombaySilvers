import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export type LedgerEntry = {
  id: string;
  dealer_id: string;
  entry_type: "debit" | "credit";
  amount: number;
  balance_after: number;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
};

export type LedgerSummary = {
  outstanding: number;
  creditLimit: number;
  credits30d: number;
  debits30d: number;
  openingBalance: number;
};

export const ledgerKeys = {
  all: ["ledger"] as const,
  entries: ["ledger", "entries"] as const,
  summary: ["ledger", "summary"] as const,
};

/**
 * Fetch the current dealer's append-only ledger entries from Supabase.
 * RLS guarantees a dealer only ever sees their own rows — no dealer_id is
 * passed by the client, the DB resolves identity from the JWT.
 */
async function fetchLedgerEntries(): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from("ledger_entries")
    .select(
      "id, dealer_id, entry_type, amount, balance_after, description, reference_type, reference_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[ledger] failed to load entries:", error.message);
    throw error;
  }

  return (data ?? []) as LedgerEntry[];
}

export function useLedgerEntries() {
  return useQuery<LedgerEntry[], Error>({
    queryKey: ledgerKeys.entries,
    queryFn: fetchLedgerEntries,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

/**
 * Summary figures derived from ledger entries + the dealer's credit limit.
 */
export function useLedgerSummary() {
  const entriesQuery = useLedgerEntries();
  const dealer = useDealer();

  return useQuery<LedgerSummary | null, Error>({
    queryKey: ledgerKeys.summary,
    enabled: !!dealer,
    queryFn: () => {
      const entries = entriesQuery.data ?? [];
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      const credits30d = entries
        .filter((e) => e.entry_type === "credit" && new Date(e.created_at).getTime() >= thirtyDaysAgo)
        .reduce((sum, e) => sum + e.amount, 0);

      const debits30d = entries
        .filter((e) => e.entry_type === "debit" && new Date(e.created_at).getTime() >= thirtyDaysAgo)
        .reduce((sum, e) => sum + e.amount, 0);

      const latest = entries[0];
      const openingBalance = latest ? latest.balance_after + (latest.entry_type === "debit" ? latest.amount : -latest.amount) : 0;

      return {
        outstanding: dealer ? Math.max(0, -dealer.current_balance) : 0,
        creditLimit: dealer?.credit_limit ?? 0,
        credits30d,
        debits30d,
        openingBalance,
      };
    },
    staleTime: 30 * 1000,
  });
}

function useDealer() {
  const { dealer } = useAuth();
  return dealer;
}