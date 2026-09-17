import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const staffKeys = {
  orders: ["staff", "orders"] as const,
  order: (id: string) => ["staff", "orders", id] as const,
  dealers: ["staff", "dealers"] as const,
  inventory: ["staff", "inventory"] as const,
  warehouses: ["staff", "warehouses"] as const,
  summary: ["staff", "summary"] as const,
};

export type StaffOrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "dispatched"
  | "in_transit"
  | "delivered"
  | "cancelled";

export interface StaffOrder {
  id: string;
  order_number: string;
  status: StaffOrderStatus;
  grand_total: number;
  subtotal: number;
  total_gst: number;
  delivery_name: string;
  delivery_city: string;
  delivery_state: string;
  delivery_address: string;
  delivery_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  dispatched_at: string | null;
  delivered_at: string | null;
  dealer: { id: string; dealer_code: string; current_balance: number; credit_limit: number; status: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    gst_rate: number;
    product: { id: string; name: string; sku: string; metal_type: string; unit: string } | null;
    warehouse: { id: string; name: string } | null;
  }>;
}

export interface InventoryRow {
  id: string;
  quantity_available: number;
  quantity_reserved: number;
  rate_per_gram: number;
  updated_at: string;
  product: { id: string; name: string; sku: string; metal_type: string; purity: number; unit: string };
  warehouse: { id: string; name: string; city: string };
}

const ORDER_STATUS_FLOW: StaffOrderStatus[] = [
  "pending",
  "confirmed",
  "dispatched",
  "in_transit",
  "delivered",
];

export function nextStatuses(status: StaffOrderStatus): StaffOrderStatus[] {
  if (status === "draft") return ["pending", "cancelled"];
  const idx = ORDER_STATUS_FLOW.indexOf(status);
  if (idx === -1) return ["cancelled"];
  return [ORDER_STATUS_FLOW[idx + 1]]
    .filter(Boolean)
    .concat(status === "pending" ? ["cancelled"] : []);
}

const orderQuery = `
  *,
  dealer:dealers(id, dealer_code, current_balance, credit_limit, status),
  items:order_items(
    id, quantity, unit_price, gst_rate,
    product:products(id, name, sku, metal_type, unit),
    warehouse:warehouses(id, name)
  )
`;

export function useStaffOrders(status?: StaffOrderStatus | "all") {
  return useQuery({
    queryKey: [...staffKeys.orders, status],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select(orderQuery)
        .order("created_at", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as StaffOrder[];
    },
    refetchInterval: 15_000,
  });
}

export function useDealerLookup(query: string) {
  return useQuery({
    queryKey: [...staffKeys.dealers, query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select(
          `id, full_name, phone, email,
           dealers!inner(id, dealer_code, status, tier, current_balance, credit_limit)`,
        )
        .or(`full_name.ilike.%${query}%, phone.ilike.%${query}%, email.ilike.%${query}%`)
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: query.trim().length >= 2,
  });
}

export function useInventory() {
  return useQuery({
    queryKey: staffKeys.inventory,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select(
          `*,
           product:products(id, name, sku, metal_type, purity, unit),
           warehouse:warehouses(id, name, city)`,
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InventoryRow[];
    },
  });
}

export function useWarehouses() {
  return useQuery({
    queryKey: staffKeys.warehouses,
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStaffSummary(status?: StaffOrderStatus | "all") {
  const { data } = useStaffOrders(status);
  if (!data) return { dueToday: 0, total: 0, lastOrder: null as null };
  const dueToday = data.filter((o) => {
    const d = o.created_at.split("T")[0];
    return d === new Date().toISOString().split("T")[0];
  }).length;
  const total = data.reduce((s, o) => s + Number(o.grand_total), 0);
  return { dueToday, total, lastOrder: data[0] ?? null };
}

export function useTransitionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      notes,
    }: {
      orderId: string;
      status: StaffOrderStatus;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("transition_order_status", {
        p_order_id: orderId,
        p_new_status: status,
        p_notes: notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.orders });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });
}

export function useReserveForOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    // Called before confirming an order: reserves stock, transitions pending→confirmed.
    mutationFn: async (orderId: string) => {
      const { error: reserveError } = await supabase.rpc(
        "reserve_inventory_for_order",
        { p_order_id: orderId },
      );
      if (reserveError) throw reserveError;
      const { data, error } = await supabase.rpc("transition_order_status", {
        p_order_id: orderId,
        p_new_status: "confirmed",
        p_notes: null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.orders });
      void queryClient.invalidateQueries({ queryKey: staffKeys.inventory });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });
}

export function useAdjustInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      inventoryId,
      delta,
      reason,
    }: {
      inventoryId: string;
      delta: number;
      reason: string;
    }) => {
      const { data, error } = await supabase.rpc("adjust_inventory", {
        p_inventory_id: inventoryId,
        p_quantity_delta: delta,
        p_reason: reason,
        p_note: null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.inventory });
      void queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });
}