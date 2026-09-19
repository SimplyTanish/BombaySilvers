import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type SalesInventoryRow = {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity_available: number;
  quantity_reserved: number;
  rate_per_gram: number;
  updated_at: string;
  products: {
    id: string;
    name: string;
    sku: string;
    metal_type: "gold" | "silver" | "platinum" | "palladium";
    purity: number;
    unit: string;
    unit_weight_grams: number;
  } | null;
  warehouses: { id: string; name: string; city: string; state: string } | null;
};

export const inventoryKeys = {
  all: ["sales-inventory"] as const,
};

async function fetchInventory(): Promise<SalesInventoryRow[]> {
  const session = await supabase.auth.getSession();
  if (!session.data.session) return [];
  const { data, error } = await supabase
    .from("inventory")
    .select(
      "id, product_id, warehouse_id, quantity_available, quantity_reserved, rate_per_gram, updated_at, products(id, name, sku, metal_type, purity, unit, unit_weight_grams), warehouses(id, name, city, state)",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[inventory] failed to load:", error.message);
    throw error;
  }

  return (data ?? []) as unknown as SalesInventoryRow[];
}

export function useInventory() {
  return useQuery<SalesInventoryRow[], Error>({
    queryKey: inventoryKeys.all,
    queryFn: fetchInventory,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/** Total value of all on-hand stock at current recorded rates. */
export function inventoryValue(rows: SalesInventoryRow[]): number {
  return rows.reduce((sum, row) => {
    const grams = row.products?.unit_weight_grams ?? 1;
    return sum + row.quantity_available * row.rate_per_gram * grams;
  }, 0);
}

/** Sum of all available units across rows. */
export function inventoryUnits(rows: SalesInventoryRow[]): number {
  return rows.reduce((sum, row) => sum + row.quantity_available, 0);
}

export type WarehouseSummary = {
  id: string;
  name: string;
  city: string;
  units: number;
  value: number;
};

export function warehouseSummaries(rows: SalesInventoryRow[]): WarehouseSummary[] {
  const byWarehouse = new Map<string, WarehouseSummary>();
  for (const row of rows) {
    const key = row.warehouses?.id ?? row.warehouse_id;
    const grams = row.products?.unit_weight_grams ?? 1;
    const value = row.quantity_available * row.rate_per_gram * grams;
    const current = byWarehouse.get(key) ?? {
      id: key,
      name: row.warehouses?.name ?? "Unknown",
      city: row.warehouses?.city ?? "",
      units: 0,
      value: 0,
    };
    current.units += row.quantity_available;
    current.value += value;
    byWarehouse.set(key, current);
  }
  return Array.from(byWarehouse.values()).sort((a, b) => b.value - a.value);
}
