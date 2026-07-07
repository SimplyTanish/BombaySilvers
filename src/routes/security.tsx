import { createFileRoute } from "@tanstack/react-router";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { Smartphone, Laptop, KeyRound, ShieldCheck, LogOut } from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () => ({ meta: [{ title: "Security · Bombay Silvers" }] }),
  component: Security,
});

const devices = [
  { i: Smartphone, name: "iPhone 15 Pro", where: "Mumbai · Airtel", last: "Now · this device", current: true },
  { i: Laptop, name: "MacBook Pro", where: "Surat · Jio Fiber", last: "2h ago", current: false },
  { i: Smartphone, name: "Pixel 8", where: "Ahmedabad · Vi", last: "3 days ago", current: false },
];

function Security() {
  return (
    <AppShell>
      <PageTitle title="Security" subtitle="Sessions · devices · access control" />

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Active sessions</div>
          <div className="mt-4 divide-y divide-border/40">
            {devices.map((d, i) => (
              <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-3)]">
                  <d.i className="h-5 w-5 text-[var(--platinum)]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{d.name}</span>
                    {d.current && <span className="rounded-full bg-[var(--gain)]/15 px-2 py-0.5 text-[10px] text-[var(--gain)]">This device</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{d.where}</div>
                  <div className="text-[11px] text-muted-foreground">Last active {d.last}</div>
                </div>
                {!d.current && (
                  <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1.5 text-xs hover:bg-[var(--surface-3)]">
                    <LogOut className="h-3.5 w-3.5" /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--gain)]" /> Security posture
          </div>
          <div className="metallic-text mt-3 font-mono text-3xl font-semibold">A+</div>
          <div className="text-xs text-muted-foreground">All recommended protections enabled</div>
          <ul className="mt-4 space-y-2 text-xs">
            {[
              ["Mobile OTP + JWT", true],
              ["Device fingerprinting", true],
              ["Session expiry · 8h", true],
              ["Rate limiting", true],
              ["Audit logging", true],
              ["Row-level security (RLS)", true],
            ].map(([k, ok]) => (
              <li key={k as string} className="flex items-center justify-between rounded-lg border border-border/60 bg-[var(--surface-2)]/60 px-3 py-2">
                <span className="text-muted-foreground">{k}</span>
                <span className={ok ? "text-[var(--gain)]" : "text-[var(--loss)]"}>{ok ? "Enabled" : "Off"}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <GlassCard className="mt-6 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Login preferences</div>
            <div className="mt-2 text-sm">Mobile OTP is required for every new device and every 30 days.</div>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1.5 text-xs">
            <KeyRound className="h-3.5 w-3.5" /> Set a passphrase
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["Trusted device duration", "30 days"],
            ["Auto sign-out (inactive)", "20 minutes"],
            ["Suspicious IP alerts", "Enabled"],
            ["Bulk order confirmation", "OTP required"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-xl border border-border/60 bg-[var(--surface-2)]/60 px-4 py-3">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="text-sm">{v}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </AppShell>
  );
}
