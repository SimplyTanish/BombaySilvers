import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { MapPin, Package, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  inventoryKeys,
  inventoryUnits,
  inventoryValue,
  useInventory,
  warehouseSummaries,
  type SalesInventoryRow,
} from "@/hooks/use-inventory";
import { fmtINR } from "@/lib/rates";
import { DealerOrderDialog } from "@/components/DealerOrderDialog";
import { ReserveStockDialog } from "@/components/ReserveStockDialog";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory · Bombay Silvers" }] }),
  component: Inventory,
});

const METALS = [
  { value: "all", label: "All metals" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
] as const;

function purityPct(purity: number | null | undefined): string {
  if (purity == null) return "—";
  return `${(purity / 10).toFixed(2)}%`;
}

function unitPrice(row: SalesInventoryRow): string {
  const grams = row.products?.unit_weight_grams ?? 1;
  return `₹${fmtINR(row.rate_per_gram * grams)}`;
}

function Inventory() {
  const queryClient = useQueryClient();
  const { data: stock = [], isLoading } = useInventory();
  const [metal, setMetal] = useState<string>("all");
  const [reserveOpen, setReserveOpen] = useState(false);
  const [orderRow, setOrderRow] = useState<SalesInventoryRow | null>(null);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });

  const rows = useMemo(
    () => (metal === "all" ? stock : stock.filter((row) => row.products?.metal_type === metal)),
    [stock, metal],
  );

  const warehouses = warehouseSummaries(stock);
  const value = inventoryValue(stock);
  const units = inventoryUnits(stock);

  return (
    <AppShell>
      <PageTitle
        title="Inventory"
        subtitle={
          isLoading
            ? "Loading stock…"
            : `${fmtUnits(units)} units · ₹${fmtINR(value)} valuation · ${warehouses.length} warehouses`
        }
        actions={
          <>
            <select
              value={metal}
              onChange={(e) => setMetal(e.target.value)}
              className="hidden h-9 rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 text-sm outline-none sm:inline-flex"
              aria-label="Filter by metal"
            >
              {METALS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setReserveOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-4 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
            >
              <Plus className="h-4 w-4" /> Reserve stock
            </button>
          </>
        }
      />

      {/* Warehouse row */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {isLoading && warehouses.length === 0
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="glass h-[92px] animate-pulse rounded-2xl" />
            ))
          : warehouses.length === 0 && (
              <GlassCard className="p-4 text-sm text-muted-foreground sm:col-span-2 md:col-span-4">
                No stock records yet.
              </GlassCard>
            )}
        {warehouses.map((w) => (
          <GlassCard key={w.id} className="p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {w.name}
            </div>
            <div className="metallic-text mt-2 font-mono text-xl font-semibold">
              ₹{fmtINR(w.value)}
            </div>
            <div className="text-xs text-muted-foreground">{fmtUnits(w.units)} units</div>
          </GlassCard>
        ))}
      </div>

      {/* Table (desktop) */}
      <GlassCard className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 text-[11px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-4 text-left">SKU</th>
              <th className="p-4 text-left">Product</th>
              <th className="p-4 text-right">Purity</th>
              <th className="p-4 text-right">Available</th>
              <th className="p-4 text-right">Reserved</th>
              <th className="p-4 text-left">Warehouse</th>
              <th className="p-4 text-right">Rate</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                  Loading stock…
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/40 last:border-0 hover:bg-[var(--surface-2)]/60"
                >
                  <td className="p-4 font-mono text-xs text-muted-foreground">
                    {row.products?.sku ?? "—"}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-3)]">
                        <Package className="h-4 w-4 text-[var(--platinum)]" />
                      </div>
                      <span>{row.products?.name ?? "Unknown product"}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono">{purityPct(row.products?.purity)}</td>
                  <td className="p-4 text-right font-mono">
                    {row.quantity_available.toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-right font-mono text-[var(--warn)]">
                    {row.quantity_reserved.toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-muted-foreground">{row.warehouses?.name ?? "—"}</td>
                  <td className="p-4 text-right font-mono">{unitPrice(row)}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setOrderRow(row)}
                      className="rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1.5 text-xs hover:bg-[var(--surface-3)]"
                    >
                      Order
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </GlassCard>

      {/* Cards (mobile) */}
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <GlassCard key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-muted-foreground">
                  {row.products?.sku ?? "—"}
                </div>
                <div className="truncate text-sm font-medium">
                  {row.products?.name ?? "Unknown"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.warehouses?.name ?? "—"} · Purity {purityPct(row.products?.purity)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">{unitPrice(row)}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  per unit
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="rounded-full bg-[var(--gain)]/10 px-2 py-0.5 text-[var(--gain)]">
                {row.quantity_available.toLocaleString("en-IN")} available
              </span>
              <span className="rounded-full bg-[var(--warn)]/10 px-2 py-0.5 text-[var(--warn)]">
                {row.quantity_reserved.toLocaleString("en-IN")} reserved
              </span>
              <button
                onClick={() => setOrderRow(row)}
                className="rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1 text-xs"
              >
                Order
              </button>
            </div>
          </GlassCard>
        ))}
        {isLoading && rows.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">Loading stock…</div>
        )}
      </div>

      <ReserveStockDialog open={reserveOpen} onOpenChange={setReserveOpen} onReserved={refresh} />
      <DealerOrderDialog
        key={orderRow?.id ?? "none"}
        open={orderRow !== null}
        onOpenChange={(open) => {
          if (!open) setOrderRow(null);
        }}
        presetInventoryId={orderRow?.id}
        onCreated={refresh}
      />
    </AppShell>
  );
}

function fmtUnits(units: number): string {
  return units.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
