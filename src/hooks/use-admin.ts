import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type AdminAnalytics = {
  activeDealers: number;
  totalDealers: number;
  mtdTurnover: number;
  openOrders: number;
  openOrderValue: number;
  inventoryValue: number;
  pendingKyc: number;
};

export type AdminDealerRow = {
  id: string;
  dealer_code: string;
  referral_code: string;
  status: string;
  tier: string;
  current_balance: number;
  credit_limit: number;
  created_at: string;
  user: { full_name: string | null; email: string | null; phone: string | null } | null;
  firms: { name: string | null; city: string | null } | null;
  referrals: { count: number } | null;
};

export type AdminAuditRow = {
  id: string;
  action: string;
  entity_type: string | null;
  created_at: string;
  ip_address: string | null;
};

export const adminKeys = {
  analytics: ["admin", "analytics"] as const,
  dealers: ["admin", "dealers"] as const,
  audit: ["admin", "audit"] as const,
};

async function fetchAnalytics(): Promise<AdminAnalytics> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [dealersRes, ordersRes, ordersMtd, inventoryRes, kycRes] = await Promise.all([
    supabase.from("dealers").select("id, current_balance, status", { count: "exact" }),
    supabase.from("orders").select("id, grand_total, status", { count: "exact" }),
    supabase
      .from("orders")
      .select("grand_total")
      .gte("created_at", monthStart.toISOString())
      .not("status", "eq", "cancelled"),
    supabase
      .from("inventory")
      .select("quantity_available, rate_per_gram")
      .gt("quantity_available", 0),
    supabase.from("dealers").select("id", { count: "exact" }).eq("status", "pending_kyc"),
  ]);

  const dealers = dealersRes.data ?? [];
  const activeDealers = dealers.filter((d) => d.status === "active").length;

  const orders = ordersRes.data ?? [];
  const openOrders = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  ).length;
  const openOrderValue = orders
    .filter((o) => o.status !== "delivered" && o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.grand_total ?? 0), 0);
  const mtdTurnover = (ordersMtd.data ?? []).reduce(
    (s, o) => s + Number(o.grand_total ?? 0),
    0,
  );
  const inventoryValue = (inventoryRes.data ?? []).reduce(
    (s, i) => s + Number(i.quantity_available ?? 0) * Number(i.rate_per_gram ?? 0),
    0,
  );

  return {
    activeDealers,
    totalDealers: dealersRes.count ?? 0,
    mtdTurnover,
    openOrders,
    openOrderValue,
    inventoryValue,
    pendingKyc: kycRes.count ?? 0,
  };
}

export function useAdminAnalytics() {
  return useQuery<AdminAnalytics, Error>({
    queryKey: adminKeys.analytics,
    queryFn: fetchAnalytics,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

async function fetchAdminDealers(): Promise<AdminDealerRow[]> {
  const { data, error } = await supabase
    .from("dealers")
    .select(
      "id, dealer_code, referral_code, status, tier, current_balance, credit_limit, created_at, user:users(full_name, email, phone), firms(name, city), referrals(count)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[admin] failed to load dealers:", error.message);
    throw error;
  }

  return (data ?? []) as unknown as AdminDealerRow[];
}

export function useAdminDealers() {
  return useQuery<AdminDealerRow[], Error>({
    queryKey: adminKeys.dealers,
    queryFn: fetchAdminDealers,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

async function fetchAuditLog(limit = 20): Promise<AdminAuditRow[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, created_at, ip_address")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin] failed to load audit log:", error.message);
    throw error;
  }

  return (data ?? []) as unknown as AdminAuditRow[];
}

export function useAdminAudit(limit = 20) {
  return useQuery<AdminAuditRow[], Error>({
    queryKey: [...adminKeys.audit, limit],
    queryFn: () => fetchAuditLog(limit),
    staleTime: 60 * 1000,
    retry: 1,
  });
}