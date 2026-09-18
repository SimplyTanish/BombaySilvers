import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { Smartphone, Laptop, KeyRound, ShieldCheck, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/security")({
  head: () => ({ meta: [{ title: "Security · Bombay Silvers" }] }),
  component: Security,
});

type SessionRow = {
  id: string;
  device_name: string | null;
  device_type: string | null;
  ip_address: string | null;
  is_trusted: boolean;
  last_active_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SessionIcon({ type }: { type: string | null }) {
  const Icon = type === "mobile" ? Smartphone : Laptop;
  return (
    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-3)]">
      <Icon className="h-5 w-5 text-[var(--platinum)]" />
    </div>
  );
}

function Security() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [sessionExpires, setSessionExpires] = useState<string | null>(null);
  const [passphraseOpen, setPassphraseOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [passphraseConfirm, setPassphraseConfirm] = useState("");
  const [savingPassphrase, setSavingPassphrase] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .order("last_active_at", { ascending: false })
      .limit(50);
    if (!error) setSessions((data ?? []) as unknown as SessionRow[]);
    setLoadingSessions(false);
    const { data: session } = await supabase.auth.getSession();
    setSessionExpires(
      session?.session?.expires_at
        ? new Date(session.session.expires_at * 1000).toLocaleString()
        : null,
    );
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const revoke = async (row: SessionRow) => {
    setRevokingId(row.id);
    const { error } = await supabase
      .from("sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", row.id);
    if (!error) {
      toast.success("Session revoked.");
      void loadSessions();
    } else {
      toast.error(error.message);
    }
    setRevokingId(null);
  };

  const signOutOthers = async () => {
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("All other devices signed out.");
    void loadSessions();
  };

  const savePassphrase = async () => {
    const value = passphrase.trim();
    if (value.length < 8) {
      toast.error("Passphrase must be at least 8 characters.");
      return;
    }
    if (value !== passphraseConfirm) {
      toast.error("Passphrases do not match.");
      return;
    }
    setSavingPassphrase(true);
    const { error } = await supabase.auth.updateUser({ data: { passphrase: value } });
    setSavingPassphrase(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Passphrase set. It will be required for order confirmations.");
    setPassphrase("");
    setPassphraseConfirm("");
    setPassphraseOpen(false);
  };

  const active = sessions.filter((s) => !s.revoked_at);

  return (
    <AppShell>
      <PageTitle title="Security" subtitle="Sessions · devices · access control" />

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Active sessions
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Session expires {sessionExpires ? `on ${sessionExpires}` : "after 8 hours"} · you can
            revoke any session below.
          </div>
          {loadingSessions ? (
            <div className="mt-4 flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
            </div>
          ) : active.length === 0 ? (
            <div className="mt-4 rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-5 text-sm text-muted-foreground">
              No historical sessions recorded. Session-level device tracking will appear here as new
              devices sign in.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border/40">
              {active.map((d, i) => (
                <div
                  key={d.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4"
                >
                  <SessionIcon type={d.device_type} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">
                        {d.device_name ?? d.device_type ?? "Device"}
                      </span>
                      {d.is_trusted && (
                        <span className="rounded-full bg-[var(--gain)]/15 px-2 py-0.5 text-[10px] text-[var(--gain)]">
                          Trusted
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.ip_address ?? "Unknown IP"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Last active {timeAgo(d.last_active_at)}
                      {i === 0 && " · current"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void revoke(d)}
                      disabled={revokingId === d.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1.5 text-xs hover:bg-[var(--surface-3)] disabled:opacity-50"
                    >
                      {revokingId === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {active.length > 0 && (
            <button
              onClick={() => void signOutOthers()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-2 text-xs hover:bg-[var(--surface-3)]"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out all other devices
            </button>
          )}
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
              <li
                key={k as string}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-[var(--surface-2)]/60 px-3 py-2"
              >
                <span className="text-muted-foreground">{k}</span>
                <span className={ok ? "text-[var(--gain)]" : "text-[var(--loss)]"}>
                  {ok ? "Enabled" : "Off"}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <GlassCard className="mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Login preferences
            </div>
            <div className="mt-2 text-sm">
              Mobile OTP is required for every new device and every 30 days.
            </div>
          </div>
          <button
            onClick={() => setPassphraseOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1.5 text-xs hover:bg-[var(--surface-3)]"
          >
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
            <div
              key={k}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-[var(--surface-2)]/60 px-4 py-3"
            >
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="text-sm">{v}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <Dialog open={passphraseOpen} onOpenChange={setPassphraseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set a passphrase</DialogTitle>
            <DialogDescription>
              Required for bulk order confirmations on this account. Store it safely — it cannot be
              recovered by support.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm">
              Passphrase
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              Confirm passphrase
              <input
                type="password"
                value={passphraseConfirm}
                onChange={(e) => setPassphraseConfirm(e.target.value)}
                className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm outline-none"
              />
            </label>
          </div>
          <DialogFooter>
            <button
              onClick={() => void savePassphrase()}
              disabled={savingPassphrase}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-4 text-sm font-medium text-black disabled:opacity-50"
            >
              {savingPassphrase ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save passphrase"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
