import { createFileRoute } from "@tanstack/react-router";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { Filter, Plus, MapPin, Package } from "lucide-react";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory · Bombay Silvers" }] }),
  component: Inventory,
});

const products = [
  { sku: "AG-999-1KG", name: "Silver Bar 999 · 1 kg", purity: "99.90%", available: 620, reserved: 40, wh: "Mumbai", price: "89,420" },
  { sku: "AG-999-100G", name: "Silver Bar 999 · 100 g", purity: "99.90%", available: 4200, reserved: 180, wh: "Ahmedabad", price: "8,942" },
  { sku: "AU-999-100G", name: "Gold Bar 999 · 100 g", purity: "99.99%", available: 148, reserved: 22, wh: "Mumbai", price: "7,21,480" },
  { sku: "AU-999-50G", name: "Gold Coin 999 · 50 g", purity: "99.99%", available: 312, reserved: 44, wh: "Delhi", price: "3,60,740" },
  { sku: "AU-995-10G", name: "Gold Coin 995 · 10 g", purity: "99.50%", available: 1820, reserved: 210, wh: "Surat", price: "71,860" },
  { sku: "AG-BAR-5KG", name: "Silver Bar 999 · 5 kg", purity: "99.90%", available: 84, reserved: 6, wh: "Mumbai", price: "4,47,100" },
];

function Inventory() {
  return (
    <AppShell>
      <PageTitle
        title="Inventory"
        subtitle="6,412 units · ₹4.82 Cr valuation · updated 48s ago"
        actions={
          <>
            <button className="hidden sm:inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 text-sm">
              <Filter className="h-4 w-4" /> Filter
            </button>
            <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-4 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <Plus className="h-4 w-4" /> Reserve stock
            </button>
          </>
        }
      />

      {/* Warehouse row */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Mumbai", "₹2.14 Cr", "3,204"],
          ["Ahmedabad", "₹1.08 Cr", "1,420"],
          ["Delhi", "₹92 L", "984"],
          ["Surat", "₹68 L", "804"],
        ].map(([c, v, u]) => (
          <GlassCard key={c} className="p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {c}
            </div>
            <div className="metallic-text mt-2 font-mono text-xl font-semibold">{v}</div>
            <div className="text-xs text-muted-foreground">{u} units</div>
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
            {products.map((p) => (
              <tr key={p.sku} className="border-b border-border/40 last:border-0 hover:bg-[var(--surface-2)]/60">
                <td className="p-4 font-mono text-xs text-muted-foreground">{p.sku}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-3)]">
                      <Package className="h-4 w-4 text-[var(--platinum)]" />
                    </div>
                    <span>{p.name}</span>
                  </div>
                </td>
                <td className="p-4 text-right font-mono">{p.purity}</td>
                <td className="p-4 text-right font-mono">{p.available.toLocaleString()}</td>
                <td className="p-4 text-right font-mono text-[var(--warn)]">{p.reserved}</td>
                <td className="p-4 text-muted-foreground">{p.wh}</td>
                <td className="p-4 text-right font-mono">₹{p.price}</td>
                <td className="p-4 text-right">
                  <button className="rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1.5 text-xs hover:bg-[var(--surface-3)]">
                    Order
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      {/* Cards (mobile) */}
      <div className="grid gap-3 md:hidden">
        {products.map((p) => (
          <GlassCard key={p.sku} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-muted-foreground">{p.sku}</div>
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {p.wh} · Purity {p.purity}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">₹{p.price}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">per unit</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="rounded-full bg-[var(--gain)]/10 px-2 py-0.5 text-[var(--gain)]">
                {p.available} available
              </span>
              <span className="rounded-full bg-[var(--warn)]/10 px-2 py-0.5 text-[var(--warn)]">
                {p.reserved} reserved
              </span>
              <button className="rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1 text-xs">Order</button>
            </div>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}
