import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, GlassCard, PageTitle, LiveDot } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { useInventory, useAdjustInventory } from "@/hooks/use-staff";
import { fmtINR } from "@/lib/rates";
import { Loader2, Search, Minus, Plus, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/inventory")({
  head: () => ({ meta: [{ title: "Stock Control · Bombay Silvers" }] }),
  component: StaffInventory,
});

function StaffInventory() {
  const { data: rows, isLoading, isError } = useInventory();
  const [query, setQuery] = useState("");
  const [adjustById, setAdjustById] = useState<string | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const adjust = useAdjustInventory();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter(
      (r) =>
        r.product.name.toLowerCase().includes(q) ||
        r.product.sku.toLowerCase().includes(q) ||
        r.warehouse.name.toLowerCase().includes(q) ||
        r.warehouse.city.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const totalValue = useMemo(
    () =>
      (rows ?? []).reduce((s, r) => s + Number(r.quantity_available) * Number(r.rate_per_gram), 0),
    [rows],
  );

  const submitAdjustment = (id: string) => {
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) {
      toast.error("Enter a non-zero numeric delta.");
      return;
    }
    if (!reason.trim()) {
      toast.error("A reason is required for the audit trail.");
      return;
    }
    adjust.mutate(
      { inventoryId: id, delta: d, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success("Stock adjusted & transaction logged.");
          setAdjustById(null);
          setDelta("");
          setReason("");
        },
      },
    );
  };

  return (
    <RequireRole role={["staff", "admin", "super_admin"]}>
      <AppShell>
        <PageTitle
          title="Stock control"
          subtitle="Live availability across warehouses"
          actions={
            <>
              <div className="hidden text-right sm:block">
                <div className="font-mono text-sm text-foreground">₹{fmtINR(totalValue)}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  total value
                </div>
              </div>
              <LiveDot label="Live stock" />
            </>
          }
        />

        {/* Search */}
        <div className="relative mb-5 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKU, product or warehouse…"
            className="h-10 w-full rounded-xl border border-border/70 bg-[var(--surface-2)] pl-9 pr-3 text-sm outline-none focus:border-[var(--silver-muted)]"
          />
        </div>

        {/* Table */}
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-[11px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="p-4 text-left">Product</th>
                <th className="p-4 text-left">Warehouse</th>
                <th className="p-4 text-right">Available</th>
                <th className="p-4 text-right">Reserved</th>
                <th className="p-4 text-right">Rate / g</th>
                <th className="p-4 text-right">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </span>
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--loss)]">
                    Could not load inventory.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No stock matches that search.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/40 last:border-0 hover:bg-[var(--surface-2)]/60"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-3)]">
                        <Package className="h-4 w-4 text-[var(--platinum)]" />
                      </div>
                      <div>
                        <div>{r.product.name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {r.product.sku}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {r.warehouse.name} · {r.warehouse.city}
                  </td>
                  <td className="p-4 text-right font-mono">{r.quantity_available}</td>
                  <td className="p-4 text-right font-mono text-[var(--warn)]">
                    {r.quantity_reserved}
                  </td>
                  <td className="p-4 text-right font-mono">₹{fmtINR(r.rate_per_gram)}</td>
                  <td className="p-4 text-right">
                    {adjustById === r.id ? (
                      <div className="inline-flex flex-col items-end gap-1.5">
                        <div className="inline-flex items-center gap-1">
                          <input
                            value={delta}
                            onChange={(e) => setDelta(e.target.value)}
                            inputMode="decimal"
                            placeholder="delta"
                            className="h-8 w-20 rounded-lg border border-border/70 bg-[var(--surface-2)] px-2 font-mono text-xs outline-none focus:border-[var(--silver-muted)]"
                          />
                          <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="reason"
                            className="h-8 w-28 rounded-lg border border-border/70 bg-[var(--surface-2)] px-2 text-xs outline-none focus:border-[var(--silver-muted)]"
                          />
                        </div>
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => submitAdjustment(r.id)}
                            disabled={adjust.isPending}
                            className="h-7 rounded-lg bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-3 text-[11px] font-medium text-black"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setAdjustById(null);
                              setDelta("");
                              setReason("");
                            }}
                            className="h-7 rounded-lg border border-border/70 px-3 text-[11px] text-muted-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAdjustById(r.id)}
                        className="rounded-lg border border-border/70 bg-[var(--surface-2)] p-1.5 text-muted-foreground hover:text-foreground"
                        title="Adjust stock"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      </AppShell>
    </RequireRole>
  );
}
