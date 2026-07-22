import { createFileRoute } from "@tanstack/react-router";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { Copy, Share2, Gift, Users2, TrendingUp } from "lucide-react";
import { KycGate } from "@/components/KycGate";

export const Route = createFileRoute("/referrals")({
  head: () => ({ meta: [{ title: "Referrals · Bombay Silvers" }] }),
  component: Referrals,
});

const refs = [
  { name: "Sanghvi Metals", city: "Rajkot", status: "Active", earned: "42,000", joined: "Mar 2026" },
  { name: "Kotecha & Sons", city: "Jaipur", status: "Active", earned: "28,500", joined: "Apr 2026" },
  { name: "Shree Silver Mart", city: "Indore", status: "Pending KYC", earned: "0", joined: "Aug 2026" },
  { name: "Vasa Bullion", city: "Vadodara", status: "Active", earned: "61,200", joined: "Jan 2026" },
];

function Referrals() {
  return (
    <AppShell>
      <PageTitle title="Referrals" subtitle="Grow the Bombay Silvers dealer network · earn on volume" />

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="relative overflow-hidden p-6 lg:col-span-2">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.14_85/0.2),transparent)]" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your referral code</div>
          <div className="metallic-text mt-3 font-mono text-4xl font-semibold tracking-widest sm:text-5xl">MEHTA-284</div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-muted-foreground">
              app.bombaysilvers.com/join/MEHTA-284
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 py-2 text-xs hover:bg-[var(--surface-3)]">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-3 py-2 text-xs font-medium text-black">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>
          <p className="mt-6 max-w-lg text-sm text-muted-foreground">
            Earn <span className="text-foreground">0.05% of turnover</span> from every dealer you onboard, for their first 12 months on the platform. Paid to your ledger monthly.
          </p>
        </GlassCard>

        <div className="grid gap-4">
          <Stat i={Users2} l="Total referrals" v="12" sub="4 active this quarter" />
          <Stat i={Gift} l="Total earned" v="₹2.84 L" sub="Credited to ledger" tone="gain" />
          <Stat i={TrendingUp} l="Rank" v="#7" sub="Nationwide leaderboard" />
        </div>
      </div>

      <GlassCard className="mt-6 overflow-hidden">
        <div className="border-b border-border/60 p-4 text-sm font-medium">Referred dealers</div>
        <div className="divide-y divide-border/40">
          {refs.map((r) => (
            <div key={r.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#d9d9dd] to-[#7a7b7f] font-mono text-xs font-bold text-black">
                {r.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.city} · joined {r.joined}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={"rounded-full px-2.5 py-1 text-[11px] " + (r.status === "Active" ? "bg-[var(--gain)]/10 text-[var(--gain)]" : "bg-[var(--warn)]/10 text-[var(--warn)]")}>{r.status}</span>
                <span className="font-mono text-sm">₹{r.earned}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </AppShell>
  );
}

function Stat({ i: Icon, l, v, sub, tone }: { i: React.ComponentType<{ className?: string }>; l: string; v: string; sub: string; tone?: "gain" }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-3)]">
          <Icon className="h-4 w-4 text-[var(--platinum)]" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{l}</div>
      </div>
      <div className={"metallic-text mt-3 font-mono text-2xl font-semibold " + (tone === "gain" ? "!bg-none !text-[var(--gain)]" : "")}>{v}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </GlassCard>
  );
}
