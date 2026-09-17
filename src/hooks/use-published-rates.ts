import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export type PublishedRate = {
  id: string;
  metal: "gold" | "silver" | "platinum" | "palladium";
  purity: number;
  label: string;
  unit: string;
  buy_rate: number;
  sell_rate: number;
  currency_code: string;
  published_by: string | null;
  published_at: string;
};

export const rateKeys = {
  published: ["rates", "published"] as const,
};

/**
 * Latest published rate per metal (from the latest_rates view).
 * Dealers and staff read this; only admins insert.
 */
export async function fetchPublishedRates(): Promise<PublishedRate[]> {
  const { data, error } = await supabase
    .from("latest_rates")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[rates] failed to load published rates:", error.message);
    throw error;
  }

  return (data ?? []) as unknown as PublishedRate[];
}

export function usePublishedRates() {
  return useQuery<PublishedRate[], Error>({
    queryKey: rateKeys.published,
    queryFn: fetchPublishedRates,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Admin: publish today's buy/sell rates. Insert-only by RLS + DB trigger,
 * so each publish is an immutable row the dealers see immediately.
 */
export function usePublishRates() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      rows: Array<Omit<PublishedRate, "id" | "published_by" | "published_at" | "currency_code">>,
    ) => {
      const payload = rows.map((r) => ({
        ...r,
        currency_code: "INR",
        published_by: user?.id ?? null,
      }));
      const { data, error } = await supabase
        .from("published_rates")
        .insert(payload)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rateKeys.published });
      void queryClient.invalidateQueries({ queryKey: ["live-rates"] });
    },
  });
}