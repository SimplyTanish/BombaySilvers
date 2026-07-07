import { createFileRoute } from "@tanstack/react-router";
import { AppShell, GlassCard, LiveDot, PageTitle } from "@/components/AppShell";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  ScrollText,
  Wallet,
  Plus,
  Bell,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Bombay Silvers" }] }),
  component: Dashboard,
});

const goldSeries = Array.from({ length: 48 }, (_, i) => ({
  t: i,
  v: 71800 + Math.sin(i / 4) * 180 + i * 6 + (i > 32 ? 90 : 0),
}));
const silverSeries = Array.from({ length: 48 }, (_, i) => ({
  t: i,
  v: 89600 - Math.cos(i / 3) * 220 - i * 4,
}));

function Dashboard() {
  return (
    <AppShell>
      <PageTitle
        title="Good morning, Rahul."
        subtitle="Markets opened 32 min ago · MCX activity strong"
        actions={
          <>
            <LiveDot label="Live rates" />
            <button className="hidden sm:inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 text-sm hover:bg-[var(--surface-3)]">
              <Bell className="h-4 w-4" /> Alerts
            </button>
            <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-4 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <Plus className="h-4 w-4" /> New order
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RateCard
          label="Gold 999"
          price="72,148"
          delta="+312"
          pct="+0.43%"
          up
          series={goldSeries}
          hint="MCX Aug · per 10g"
        />
        <RateCard
          label="Silver 999"
          price="89,420"
          delta="-145"
          pct="-0.16%"
          series={silverSeries}
          hint="MCX Sep · per kg"
        />
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Inventory value</div>
              <div className="metallic-text mt-2 font-mono text-3xl font-semibold">₹4.82 Cr</div>
              <div className="mt-1 text-xs text-muted-foreground">Across 4 warehouses</div>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--surface-3)]">
              <Boxes className="h-6 w-6 text-[var(--platinum)]" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[
              ["Silver 999", "1,240 kg"],
              ["Gold bars", "18.4 kg"],
              ["Coins", "6,412"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-border/60 bg-[var(--surface-2)]/60 py-2">
                <div className="font-mono text-sm">{v}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Quick actions */}
        <GlassCard className="p-5 lg:col-span-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Quick actions</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { i: ScrollText, l: "Place order" },
              { i: Boxes, l: "Reserve stock" },
              { i: Wallet, l: "Pay ledger" },
              { i: Bell, l: "Set rate alert" },
            ].map(({ i: Icon, l }) => (
              <button
                key={l}
                className="group flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-4 text-left transition-colors hover:bg-[var(--surface-3)]"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface-3)] transition-transform group-hover:-translate-y-0.5">
                  <Icon className="h-4 w-4 text-[var(--platinum)]" />
                </div>
                <div className="text-sm">{l}</div>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Recent orders */}
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Recent orders</div>
              <div className="mt-1 text-sm text-muted-foreground">Last 24 hours · 6 total</div>
            </div>
            <button className="text-xs text-muted-foreground hover:text-foreground">View all →</button>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {[
              ["#BS-24-11284", "Silver 999 · 50 kg", "Dispatched", "₹44.71 L", "gain"],
              ["#BS-24-11279", "Gold coins · 20 × 50g", "Processing", "₹72.14 L", "warn"],
              ["#BS-24-11271", "Silver bars · 100 kg", "Approved", "₹89.42 L", "warn"],
              ["#BS-24-11268", "Gold 999 · 500 g", "Delivered", "₹36.07 L", "gain"],
            ].map(([id, item, status, amt, tone]) => (
              <div key={id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs text-muted-foreground">{id}</div>
                  <div className="truncate text-sm">{item}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={
                      "hidden rounded-full px-2 py-0.5 text-[11px] sm:inline-flex " +
                      (tone === "gain"
                        ? "bg-[var(--gain)]/10 text-[var(--gain)]"
                        : "bg-[var(--warn)]/10 text-[var(--warn)]")
                    }
                  >
                    {status}
                  </span>
                  <span className="font-mono text-sm">{amt}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Notifications strip */}
      <GlassCard className="mt-6 p-5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Notifications</div>
          <span className="text-xs text-muted-foreground">3 unread</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ["Rate alert", "Silver 999 crossed ₹89,500/kg", "2m ago", "warn"],
            ["Ledger", "Payment of ₹18.42 L received", "1h ago", "gain"],
            ["Inventory", "Gold 100g bars restocked (Mumbai)", "3h ago", "info"],
          ].map(([t, d, ago, tone]) => (
            <div key={t as string} className="rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-4">
              <div className="flex items-center gap-2">
                <span
                  className={
                    "h-1.5 w-1.5 rounded-full " +
                    (tone === "gain"
                      ? "bg-[var(--gain)]"
                      : tone === "warn"
                        ? "bg-[var(--warn)]"
                        : "bg-[var(--silver)]")
                  }
                />
                <div className="text-sm font-medium">{t}</div>
                <div className="ml-auto text-[10px] text-muted-foreground">{ago}</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </AppShell>
  );
}

function RateCard({
  label,
  price,
  delta,
  pct,
  up,
  series,
  hint,
}: {
  label: string;
  price: string;
  delta: string;
  pct: string;
  up?: boolean;
  series: { t: number; v: number }[];
  hint: string;
}) {
  const color = up ? "var(--gain)" : "var(--loss)";
  return (
    <GlassCard className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
          <div className="metallic-text mt-2 font-mono text-3xl font-semibold">₹{price}</div>
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        </div>
        <div
          className="flex items-center gap-1 rounded-full px-2 py-1 font-mono text-xs"
          style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}
        >
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {delta} · {pct}
        </div>
      </div>
      <div className="mt-4 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={["dataMin - 60", "dataMax + 60"]} />
            <Tooltip
              contentStyle={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(v: number) => [`₹${v.toFixed(0)}`, label]}
            />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#g-${label})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
