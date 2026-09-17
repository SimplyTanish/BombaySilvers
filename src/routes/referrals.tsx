import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { Copy, Share2, Gift, Users2, TrendingUp, Check } from "lucide-react";
import { KycGate } from "@/components/KycGate";
import { useMyReferralCode, useMyReferrals } from "@/hooks/use-referrals";
import { fmtINR } from "@/lib/rates";
import { toast } from "sonner";

export const Route = createFileRoute("/referrals")({
  head: () => ({ meta: [{ title: "Referrals · Bombay Silvers" }] }),
  component: Referrals,
});

const JOIN_URL_BASE = "app.bombaysilvers.com/join/";

const statusTone: Record<string, string> = {
  pending: "bg-[var(--warn)]/10 text-[var(--warn)]",
  joined: "bg-[var(--silver)]/15 text-[var(--platinum)]",
  active: "bg-[var(--silver)]/15 text-[var(--platinum)]",
  rewarded: "bg-[var(--gain)]/10 text-[var(--gain)]",
};

function Referrals() {
  const { data: myCode } = useMyReferralCode();
  const { data, isLoading, isError } = useMyReferrals();
  const [copied, setCopied] = useState(false);

  const code = myCode ?? "";
  const joinUrl = `${JOIN_URL_BASE}${code}`;
  const stats = data?.stats;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success("Referral link copied.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy. Select the link manually.");
    }
  };

  const share = async () => {
    const text = `Join me on the Bombay Silvers dealer network — bullion & precious metals at live wholesale rates. ${joinUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Bombay Silvers", text });
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Referral message copied to clipboard.");
    } catch {
      toast.error("Could not share. Try copying the link instead.");
    }
  };

  return (
    <AppShell>
      <PageTitle
        title="Referrals"
        subtitle="Grow the Bombay Silvers dealer network · earn on volume"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="relative overflow-hidden p-6 lg:col-span-2">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.14_85/0.2),transparent)]" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Your referral code
          </div>
          <div className="metallic-text mt-3 font-mono text-4xl font-semibold tracking-widest sm:text-5xl">
            {code || "—"}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-muted-foreground">
              {joinUrl || "Loading…"}
            </div>
            <button
              onClick={() => void copy()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 py-2 text-xs hover:bg-[var(--surface-3)]"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[var(--gain)]" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copy
            </button>
            <button
              onClick={() => void share()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-3 py-2 text-xs font-medium text-black"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>
          <p className="mt-6 max-w-lg text-sm text-muted-foreground">
            Earn <span className="text-foreground">0.05% of turnover</span> from every dealer you
            onboard, for their first 12 months on the platform. Paid to your ledger monthly.
          </p>
        </GlassCard>

        <div className="grid gap-4">
          <Stat
            i={Users2}
            l="Total referrals"
            v={stats ? String(stats.total) : "—"}
            sub={stats ? `${stats.active} active this quarter` : "Loading"}
          />
          <Stat
            i={Gift}
            l="Total earned"
            v={stats ? `₹${fmtINR(stats.earned)}` : "—"}
            sub="Credited to ledger"
            tone="gain"
          />
          <Stat
            i={TrendingUp}
            l="Pending invites"
            v={stats ? String(stats.pending) : "—"}
            sub="Awaiting KYC completion"
          />
        </div>
      </div>

      <GlassCard className="mt-6 overflow-hidden">
        <div className="border-b border-border/60 p-4 text-sm font-medium">Referred dealers</div>
        {isLoading && (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading referrals…</div>
        )}
        {isError && (
          <div className="p-8 text-center text-sm text-[var(--loss)]">
            Could not load referrals.
          </div>
        )}
        {!isLoading && !isError && (data?.rows.length ?? 0) === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No referrals yet. Share your code above to start growing the network.
          </div>
        )}
        <div className="divide-y divide-border/40">
          {(data?.rows ?? []).map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#d9d9dd] to-[#7a7b7f] font-mono text-xs font-bold text-black">
                {r.referred_name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.referred_name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.referred_phone} · {r.referred_dealer?.dealer_code ?? "not registered yet"} ·
                  joined{" "}
                  {new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(
                    new Date(r.created_at),
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    "rounded-full px-2.5 py-1 text-[11px] " +
                    (statusTone[r.status] ?? statusTone.pending)
                  }
                >
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </span>
                <span className="font-mono text-sm">₹{fmtINR(r.commission_amount ?? 0)}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </AppShell>
  );
}

function Stat({
  i: Icon,
  l,
  v,
  sub,
  tone,
}: {
  i: React.ComponentType<{ className?: string }>;
  l: string;
  v: string;
  sub: string;
  tone?: "gain";
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-3)]">
          <Icon className="h-4 w-4 text-[var(--platinum)]" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{l}</div>
      </div>
      <div
        className={
          "metallic-text mt-3 font-mono text-2xl font-semibold " +
          (tone === "gain" ? "!bg-none !text-[var(--gain)]" : "")
        }
      >
        {v}
      </div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </GlassCard>
  );
}
