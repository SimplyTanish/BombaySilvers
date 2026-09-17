import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const referralKeys = {
  mine: ["referrals", "mine"] as const,
  code: ["referrals", "code"] as const,
};

export interface MyReferralRow {
  id: string;
  referred_name: string;
  referred_phone: string;
  status: "pending" | "joined" | "active" | "rewarded";
  commission_rate: number;
  commission_amount: number | null;
  commission_paid_at: string | null;
  created_at: string;
  referred_dealer: { dealer_code: string } | null;
}

export interface ReferralStats {
  total: number;
  pending: number;
  active: number;
  earned: number;
}

/**
 * Dealer's own referral code. Every dealer is assigned one at onboarding.
 */
export function useMyReferralCode() {
  return useQuery({
    queryKey: referralKeys.code,
    queryFn: async () => {
      const { data } = await supabase.from("dealers").select("referral_code").single();
      return (data?.referral_code ?? null) as string | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Referrals initiated by the current dealer, plus aggregate stats.
 */
export function useMyReferrals() {
  return useQuery({
    queryKey: referralKeys.mine,
    queryFn: async () => {
      const {
        data,
        error,
        count,
      } = await supabase
        .from("referrals")
        .select("id, referred_name, referred_phone, status, commission_rate, commission_amount, commission_paid_at, created_at, referred_dealer:dealers(dealer_code)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[referrals] failed to load:", error.message);
        throw error;
      }

      const rows = (data ?? []) as unknown as MyReferralRow[];
      const stats: ReferralStats = {
        total: count ?? rows.length,
        pending: rows.filter((r) => r.status === "pending").length,
        active: rows.filter((r) => r.status === "active" || r.status === "rewarded").length,
        earned: rows.reduce(
          (sum, r) => sum + Number(r.status === "rewarded" ? r.commission_amount ?? 0 : 0),
          0,
        ),
      };
      return { rows, stats };
    },
    staleTime: 60 * 1000,
  });
}