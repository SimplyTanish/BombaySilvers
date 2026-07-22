import { createFileRoute } from "@tanstack/react-router";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Download, TrendingUp } from "lucide-react";
import { KycGate } from "@/components/KycGate";

export const Route = createFileRoute("/ledger")({
  head: () => ({ meta: [{ title: "Ledger · Bombay Silvers" }] }),
  component: Ledger,
});

const months = [
  { m: "Feb", credit: 42, debit: 38 },
  { m: "Mar", credit: 51, debit: 44 },
  { m: "Apr", credit: 48, debit: 52 },
  { m: "May", credit: 62, debit: 55 },
  { m: "Jun", credit: 71, debit: 60 },
  { m: "Jul", credit: 68, debit: 64 },
  { m: "Aug", credit: 82, debit: 71 },
];

const txns = [
  { d: "12 Aug", desc: "Payment received · NEFT HDFC0000123", type: "Credit", amt: "18,42,000" },
  { d: "11 Aug", desc: "Invoice INV-24-2841 · Silver 999 50 kg", type: "Debit", amt: "44,71,000" },
  { d: "10 Aug", desc: "Payment received · RTGS", type: "Credit", amt: "72,00,000" },
  { d: "09 Aug", desc: "Invoice INV-24-2839 · Gold 100g × 20", type: "Debit", amt: "1,44,29,600" },
  { d: "07 Aug", desc: "Refund · order #BS-24-11201", type: "Credit", amt: "3,60,000" },
  { d: "05 Aug", desc: "Invoice INV-24-2831 · Silver bars 100 kg", type: "Debit", amt: "89,42,000" },
];

function Ledger() {
  return (
    <AppShell>
      <PageTitle
        title="Ledger"
        subtitle="Mehta Bullion Traders · A/c BS-D-0284"
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-[var(--surface-2)] px-4 text-sm hover:bg-[var(--surface-3)]">
            <Download className="h-4 w-4" /> Statement PDF
          </button>
        }
      />

      <KycGate feature="view your ledger">
      <div className="grid gap-4 lg:grid-cols-4">
        <GlassCard className="p-5 lg:col-span-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Outstanding</div>
          <div className="metallic-text mt-2 font-mono text-3xl font-semibold">₹1.24 Cr</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-[var(--gain)]">
            <TrendingUp className="h-3.5 w-3.5" /> Within credit limit (₹2.5 Cr)
          </div>
          <div className="mt-5 space-y-2 text-sm">
            <Row l="Credits (Aug)" v="₹82,00,000" tone="gain" />
            <Row l="Debits (Aug)" v="₹71,42,000" tone="loss" />
            <Row l="Opening balance" v="₹1.13 Cr" />
            <Row l="Credit limit" v="₹2.50 Cr" />
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Credit vs debit · last 7 months</div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--gain)" }} /> Credit</span>
              <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--loss)" }} /> Debit</span>
            </div>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} barCategoryGap={16}>
                <XAxis dataKey="m" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}L`} />
                <Tooltip
                  contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                  cursor={{ fill: "var(--surface-2)" }}
                  formatter={(v: number, n: string) => [`₹${v} L`, n]}
                />
                <Bar dataKey="credit" fill="var(--gain)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="debit" fill="var(--loss)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <div className="text-sm font-medium">Recent transactions</div>
          <button className="text-xs text-muted-foreground hover:text-foreground">Filter →</button>
        </div>
        <div className="divide-y divide-border/40">
          {txns.map((t, i) => (
            <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4 hover:bg-[var(--surface-2)]/60">
              <div className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{t.d}</div>
              <div className="min-w-0">
                <div className="truncate text-sm">{t.desc}</div>
                <div className="text-[11px] text-muted-foreground">{t.type}</div>
              </div>
              <div className={"font-mono text-sm " + (t.type === "Credit" ? "text-[var(--gain)]" : "text-[var(--loss)]")}>
                {t.type === "Credit" ? "+" : "−"} ₹{t.amt}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
      </KycGate>
    </AppShell>
  );
}

function Row({ l, v, tone }: { l: string; v: string; tone?: "gain" | "loss" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-[var(--surface-2)]/60 px-3 py-2">
      <span className="text-xs text-muted-foreground">{l}</span>
      <span className={"font-mono text-sm " + (tone === "gain" ? "text-[var(--gain)]" : tone === "loss" ? "text-[var(--loss)]" : "")}>{v}</span>
    </div>
  );
}
