import { createFileRoute } from "@tanstack/react-router";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { CheckCircle2, Circle, Truck, PackageCheck, Clock, Plus } from "lucide-react";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Orders · Bombay Silvers" }] }),
  component: Orders,
});

const orders = [
  { id: "#BS-24-11284", item: "Silver 999 · 50 kg", status: "Dispatched", amount: "44,71,000", date: "Today · 09:42" },
  { id: "#BS-24-11279", item: "Gold coins · 20 × 50g", status: "Processing", amount: "72,14,800", date: "Today · 08:18" },
  { id: "#BS-24-11271", item: "Silver bars · 100 kg", status: "Approved", amount: "89,42,000", date: "Yesterday" },
  { id: "#BS-24-11268", item: "Gold 999 · 500 g", status: "Delivered", amount: "36,07,400", date: "Yesterday" },
  { id: "#BS-24-11261", item: "Silver 999 · 200 kg", status: "Delivered", amount: "1,78,84,000", date: "2 days ago" },
  { id: "#BS-24-11255", item: "Gold coins · 100 × 10g", status: "Pending", amount: "71,86,000", date: "2 days ago" },
];

const tone: Record<string, string> = {
  Pending: "bg-[var(--surface-3)] text-muted-foreground",
  Approved: "bg-[var(--warn)]/10 text-[var(--warn)]",
  Processing: "bg-[var(--warn)]/10 text-[var(--warn)]",
  Dispatched: "bg-[var(--silver)]/15 text-[var(--platinum)]",
  Delivered: "bg-[var(--gain)]/10 text-[var(--gain)]",
};

function Orders() {
  return (
    <AppShell>
      <PageTitle
        title="Orders"
        subtitle="6 orders · ₹5.92 Cr in flight"
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-4 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <Plus className="h-4 w-4" /> New order
          </button>
        }
      />

      {/* Tracking hero */}
      <GlassCard className="mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Tracking</div>
            <div className="mt-1 font-mono text-sm text-muted-foreground">#BS-24-11284</div>
            <h2 className="mt-1 text-lg font-semibold">Silver 999 · 50 kg · Dispatched</h2>
          </div>
          <div className="text-right">
            <div className="metallic-text font-mono text-2xl font-semibold">₹44,71,000</div>
            <div className="text-xs text-muted-foreground">ETA · Tomorrow, 4:30 PM · Surat</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 items-start gap-2">
          {[
            { l: "Pending", i: Circle, done: true },
            { l: "Approved", i: CheckCircle2, done: true },
            { l: "Processing", i: PackageCheck, done: true },
            { l: "Dispatched", i: Truck, done: true, active: true },
          ].map((s, i, arr) => (
            <div key={s.l} className="relative flex flex-col items-center">
              {i < arr.length - 1 && (
                <div className={"absolute left-1/2 top-4 h-px w-full " + (arr[i + 1].done ? "bg-[var(--gain)]/40" : "bg-border/60")} />
              )}
              <div
                className={
                  "z-10 grid h-8 w-8 place-items-center rounded-full border " +
                  (s.active
                    ? "border-[var(--silver)] bg-gradient-to-br from-[#e9e9ec] to-[#8b8c90] text-black"
                    : s.done
                      ? "border-[var(--gain)]/40 bg-[var(--gain)]/15 text-[var(--gain)]"
                      : "border-border bg-[var(--surface-2)] text-muted-foreground")
                }
              >
                <s.i className="h-4 w-4" />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          {[
            ["Warehouse", "Mumbai · Zone A"],
            ["Carrier", "Sequel Logistics"],
            ["Insured", "Yes · ₹50 L"],
            ["Contact", "Rajeev · 98204…"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border/60 bg-[var(--surface-2)]/60 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
              <div className="mt-1 text-sm">{v}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* List */}
      <GlassCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <div className="text-sm font-medium">All orders</div>
          <div className="flex gap-1">
            {["All", "Pending", "Processing", "Dispatched", "Delivered"].map((f, i) => (
              <button
                key={f}
                className={
                  "rounded-lg px-3 py-1.5 text-xs " +
                  (i === 0
                    ? "bg-[var(--surface-3)] text-foreground"
                    : "text-muted-foreground hover:bg-[var(--surface-2)]")
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border/40">
          {orders.map((o) => (
            <div key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 hover:bg-[var(--surface-2)]/60">
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted-foreground">{o.id}</div>
                <div className="truncate text-sm">{o.item}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {o.date}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={"rounded-full px-2.5 py-1 text-[11px] " + tone[o.status]}>{o.status}</span>
                <span className="font-mono text-sm">₹{o.amount}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </AppShell>
  );
}
