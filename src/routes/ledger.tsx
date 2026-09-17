import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Download, TrendingUp, Loader2 } from "lucide-react";
import { KycGate } from "@/components/KycGate";
import { useLedgerEntries, useLedgerSummary } from "@/hooks/use-ledger";
import { useAuth } from "@/hooks/use-auth";
import { fmtINR } from "@/lib/rates";

export const Route = createFileRoute("/ledger")({
  head: () => ({ meta: [{ title: "Ledger · Bombay Silvers" }] }),
  component: Ledger,
});

function Ledger() {
  const { dealer } = useAuth();
  const { data: entries, isLoading, isError } = useLedgerEntries();
  const { data: summary } = useLedgerSummary();

  const byMonth = useMemoMonthlyBreakdown(entries ?? []);

  return (
    <AppShell>
      <PageTitle
        title="Ledger"
        subtitle={dealer?.dealer_code ? `A/c ${dealer.dealer_code}` : "Your account"}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-[var(--surface-2)] px-4 text-sm hover:bg-[var(--surface-3)]">
            <Download className="h-4 w-4" /> Statement PDF
          </button>
        }
      />

      <KycGate feature="view your ledger">
        <div className="grid gap-4 lg:grid-cols-4">
          <GlassCard className="p-5 lg:col-span-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Outstanding
            </div>
            <div className="metallic-text mt-2 font-mono text-3xl font-semibold">
              ₹{fmtINR(summary?.outstanding ?? 0)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-[var(--gain)]">
              <TrendingUp className="h-3.5 w-3.5" />
              {summary && summary.creditLimit > 0
                ? `Within credit limit (₹${fmtINR(summary.creditLimit)})`
                : "No credit limit set"}
            </div>
            <div className="mt-5 space-y-2 text-sm">
              <Row l="Credits (30d)" v={`₹${fmtINR(summary?.credits30d ?? 0)}`} tone="gain" />
              <Row l="Debits (30d)" v={`₹${fmtINR(summary?.debits30d ?? 0)}`} tone="loss" />
              <Row l="Opening balance" v={`₹${fmtINR(summary?.openingBalance ?? 0)}`} />
              <Row l="Credit limit" v={`₹${fmtINR(summary?.creditLimit ?? 0)}`} />
            </div>
          </GlassCard>

          <GlassCard className="p-5 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Credit vs debit · last 6 months
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <i
                    className="inline-block h-2 w-2 rounded-sm"
                    style={{ background: "var(--gain)" }}
                  />{" "}
                  Credit
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i
                    className="inline-block h-2 w-2 rounded-sm"
                    style={{ background: "var(--loss)" }}
                  />{" "}
                  Debit
                </span>
              </div>
            </div>
            <div className="mt-4 h-56">
              {byMonth.length === 0 ? (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  No activity yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byMonth} barCategoryGap={16}>
                    <XAxis
                      dataKey="m"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${Math.round(v / 100000)}L`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      cursor={{ fill: "var(--surface-2)" }}
                      formatter={(v: number, n: string) => [`₹${fmtINR(v)}`, n]}
                    />
                    <Bar dataKey="credit" fill="var(--gain)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="debit" fill="var(--loss)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <div className="text-sm font-medium">Recent transactions</div>
            {!isLoading && (
              <span className="text-xs text-muted-foreground">{entries?.length ?? 0} entries</span>
            )}
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading ledger…
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-sm text-[var(--loss)]">
              Could not load your ledger. Please refresh.
            </div>
          ) : (entries ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No transactions on your ledger yet.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {entries!.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 hover:bg-[var(--surface-2)]/60"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm">{t.description}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {formatDate(t.created_at)} · {t.entry_type === "credit" ? "Credit" : "Debit"}
                      {t.reference_id ? ` · ref ${t.reference_id.slice(0, 8).toUpperCase()}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        "font-mono text-sm " +
                        (t.entry_type === "credit" ? "text-[var(--gain)]" : "text-[var(--loss)]")
                      }
                    >
                      {t.entry_type === "credit" ? "+" : "−"} ₹{fmtINR(t.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </KycGate>
    </AppShell>
  );
}

function Row({ l, v, tone }: { l: string; v: string; tone?: "gain" | "loss" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-[var(--surface-2)]/60 px-3 py-2">
      <span className="text-xs text-muted-foreground">{l}</span>
      <span
        className={
          "font-mono text-sm " +
          (tone === "gain" ? "text-[var(--gain)]" : tone === "loss" ? "text-[var(--loss)]" : "")
        }
      >
        {v}
      </span>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function useMemoMonthlyBreakdown(
  entries: { entry_type: string; amount: number; created_at: string }[],
) {
  return useMemo(() => {
    const buckets = new Map<string, { credit: number; debit: number }>();
    for (const e of entries) {
      const d = new Date(e.created_at);
      const key = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      const cur = buckets.get(key) ?? { credit: 0, debit: 0 };
      if (e.entry_type === "credit") cur.credit += e.amount;
      else cur.debit += e.amount;
      buckets.set(key, cur);
    }
    return Array.from(buckets.entries()).map(([m, v]) => ({ m, ...v }));
  }, [entries]);
}
