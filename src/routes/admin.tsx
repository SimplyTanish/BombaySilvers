import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, GlassCard, LiveDot, PageTitle } from "@/components/AppShell";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Users2,
  Boxes,
  ScrollText,
  IndianRupee,
  Loader2,
  ShieldAlert,
  FileCheck2,
  Send,
} from "lucide-react";
import { RequireRole } from "@/components/RequireRole";
import { useAdminAnalytics, useAdminDealers, useAdminAudit } from "@/hooks/use-admin";
import {
  usePublishedRates,
  usePublishRates,
  type PublishedRate,
} from "@/hooks/use-published-rates";
import { fmtINR } from "@/lib/rates";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Bombay Silvers" }] }),
  component: Admin,
});

const metalNames = ["gold", "silver", "platinum", "palladium"] as const;

function Admin() {
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
  } = useAdminAnalytics();
  const { data: dealers, isLoading: dealersLoading } = useAdminDealers();
  const { data: audit, isLoading: auditLoading } = useAdminAudit(15);
  const { data: rates } = usePublishedRates();

  const rateSheet: Array<{
    metal: PublishedRate["metal"];
    label: string;
    buy: string;
    sell: string;
  }> = metalNames.map((m) => {
    const current = rates?.find((r) => r.metal === m);
    return {
      metal: m,
      label:
        current?.label ??
        (m === "gold"
          ? "Gold 24K"
          : m === "silver"
            ? "Silver 999"
            : m === "platinum"
              ? "Platinum"
              : "Palladium"),
      buy: current?.buy_rate != null ? String(current.buy_rate) : "",
      sell: current?.sell_rate != null ? String(current.sell_rate) : "",
    };
  });

  return (
    <RequireRole role={["admin", "super_admin"]}>
      <AppShell>
        <PageTitle
          title="Admin dashboard"
          subtitle="Network health · rate controls · audit"
          actions={<LiveDot label="System operational" />}
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPI
            i={Users2}
            l="Active dealers"
            v={analytics ? String(analytics.activeDealers) : "—"}
            d={
              analytics
                ? `of ${analytics.totalDealers} total · ${analytics.pendingKyc} in KYC`
                : "Loading"
            }
            tone="gain"
          />
          <KPI
            i={IndianRupee}
            l="MTD turnover"
            v={analytics ? `₹${fmtINR(analytics.mtdTurnover)}` : "—"}
            d="Revenue this month"
            tone="gain"
          />
          <KPI
            i={ScrollText}
            l="Open orders"
            v={analytics ? String(analytics.openOrders) : "—"}
            d={analytics ? `₹${fmtINR(analytics.openOrderValue)} in flight` : ""}
          />
          <KPI
            i={Boxes}
            l="Inventory value"
            v={analytics ? `₹${fmtINR(analytics.inventoryValue)}` : "—"}
            d="At current stocked rates"
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <RateHistoryCard />
          <RatePublishCard sheet={rateSheet} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <GlassCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 p-4">
              <span className="text-sm font-medium">Dealers</span>
              {dealersLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {analyticsError && (
              <div className="p-6 text-center text-sm text-[var(--loss)]">
                Could not load analytics.
              </div>
            )}
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="p-3 text-left">Dealer</th>
                  <th className="p-3 text-left">Code</th>
                  <th className="p-3 text-left">Tier</th>
                  <th className="p-3 text-right">Balance</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {dealers?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                      No dealers yet.
                    </td>
                  </tr>
                )}
                {dealers?.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-border/40 last:border-0 hover:bg-[var(--surface-2)]/60"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#d9d9dd] to-[#7a7b7f] font-mono text-[10px] font-bold text-black">
                          {initials(d.firms?.name ?? d.user?.full_name ?? d.dealer_code)}
                        </div>
                        <span>{d.firms?.name ?? d.user?.full_name ?? d.dealer_code}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{d.dealer_code}</td>
                    <td className="p-3">{titleCase(d.tier)}</td>
                    <td
                      className={`p-3 text-right font-mono ${d.current_balance < 0 ? "text-[var(--loss)]" : "text-[var(--gain)]"}`}
                    >
                      ₹{fmtINR(-d.current_balance)}
                    </td>
                    <td className="p-3">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[11px] " +
                          (d.status === "active"
                            ? "bg-[var(--gain)]/10 text-[var(--gain)]"
                            : d.status === "pending_kyc"
                              ? "bg-[var(--warn)]/10 text-[var(--warn)]"
                              : "bg-[var(--loss)]/10 text-[var(--loss)]")
                        }
                      >
                        {titleCase(d.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" /> Audit log
            </div>
            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto">
              {auditLoading && (
                <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              )}
              {!auditLoading && audit?.length === 0 && (
                <div className="p-3 text-xs text-muted-foreground">No audit entries yet.</div>
              )}
              {audit?.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-border/60 bg-[var(--surface-2)]/60 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-muted-foreground">
                      {new Intl.DateTimeFormat("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(a.created_at))}
                    </span>
                    {a.ip_address && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {a.ip_address}
                      </span>
                    )}
                  </div>
                  <div className="mt-1">{titleCase(a.action)}</div>
                  {a.entity_type && (
                    <div className="mt-1 text-[10px] text-muted-foreground">{a.entity_type}</div>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </AppShell>
    </RequireRole>
  );
}

// Tremendous simply-wired rate history chart built from the last 30 published rows.
function RateHistoryCard() {
  const { data: rates } = usePublishedRates();
  const byMetal = (metal: PublishedRate["metal"]) =>
    (rates ?? [])
      .filter((r) => r.metal === metal)
      .slice(0, 30)
      .reverse();

  const gold = byMetal("gold");
  const silver = byMetal("silver");

  const series = gold.map((g, i) => ({
    d: i,
    gold: g.sell_rate,
    silver: silver[i]?.sell_rate ?? 0,
  }));

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Sell rate history · published
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {gold.length || silver.length
              ? `${gold.length || silver.length} publishes recorded`
              : "No publishes yet — use the rate control"}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--gold)" }}
            />{" "}
            Gold
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--platinum)" }}
            />{" "}
            Silver
          </span>
        </div>
      </div>
      <div className="mt-4 h-64">
        {series.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Live rate chart appears here after you publish rates.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <XAxis
                dataKey="d"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={["dataMin - 200", "dataMax + 200"]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="gold"
                stroke="var(--gold)"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="silver"
                stroke="var(--platinum)"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </GlassCard>
  );
}

function RatePublishCard({
  sheet,
}: {
  sheet: Array<{ metal: PublishedRate["metal"]; label: string; buy: string; sell: string }>;
}) {
  const [rates, setRates] = useState(sheet);
  const publish = usePublishRates();

  // Keep the local sheet in sync when DB data loads after mount.
  const synced = sheet.some((r) => r.buy !== "" || r.sell !== "");
  const editable = synced ? sheet : rates;

  const setField = (metal: PublishedRate["metal"], field: "buy" | "sell", value: string) => {
    setRates((prev) => prev.map((r) => (r.metal === metal ? { ...r, [field]: value } : r)));
  };

  const submit = () => {
    const rows = editable.map((r) => ({
      metal: r.metal,
      purity: 99.9,
      label: r.label,
      unit: "gram",
      buy_rate: Number(r.buy),
      sell_rate: Number(r.sell),
    }));
    if (
      rows.some(
        (r) =>
          !Number.isFinite(r.buy_rate) ||
          r.buy_rate <= 0 ||
          !Number.isFinite(r.sell_rate) ||
          r.sell_rate <= 0,
      )
    ) {
      toast.error("Enter valid buy and sell rates (₹ per gram).");
      return;
    }
    publish.mutate(rows, {
      onSuccess: () => toast.success("Rates published to all dealers."),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <GlassCard className="p-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Publish today's rates (₹ / gram)
      </div>
      <div className="mt-4 space-y-4">
        {editable.map((r) => (
          <div key={r.metal} className="space-y-2">
            <div className="text-xs font-medium text-foreground">{r.label}</div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  Buy ₹
                </span>
                <input
                  defaultValue={r.buy}
                  onChange={(e) => setField(r.metal, "buy", e.target.value)}
                  inputMode="decimal"
                  className="h-10 w-full rounded-lg border border-border/70 bg-[var(--surface-2)] pl-14 pr-3 font-mono text-sm outline-none focus:border-[var(--silver-muted)]"
                />
              </div>
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  Sell ₹
                </span>
                <input
                  defaultValue={r.sell}
                  onChange={(e) => setField(r.metal, "sell", e.target.value)}
                  inputMode="decimal"
                  className="h-10 w-full rounded-lg border border-border/70 bg-[var(--surface-2)] pl-13 pr-3 font-mono text-sm outline-none focus:border-[var(--silver-muted)]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={publish.isPending}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] disabled:opacity-50"
      >
        {publish.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Publish to dealers
      </button>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <FileCheck2 className="h-3.5 w-3.5" />
        Publish is append-only — a new row locks today's rates.
      </div>
    </GlassCard>
  );
}

function KPI({
  i: Icon,
  l,
  v,
  d,
  tone,
}: {
  i: React.ComponentType<{ className?: string }>;
  l: string;
  v: string;
  d: string;
  tone?: "gain";
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{l}</div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface-3)]">
          <Icon className="h-4 w-4 text-[var(--platinum)]" />
        </div>
      </div>
      <div className="metallic-text mt-3 font-mono text-2xl font-semibold">{v}</div>
      <div
        className={
          "mt-1 text-xs " + (tone === "gain" ? "text-[var(--gain)]" : "text-muted-foreground")
        }
      >
        {d}
      </div>
    </GlassCard>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function titleCase(s: string): string {
  return s
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
