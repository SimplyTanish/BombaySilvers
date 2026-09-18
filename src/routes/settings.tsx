import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { Building2, User, Receipt, Bell, CreditCard, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Bombay Silvers" }] }),
  component: Settings,
});

type Firm = {
  id: string;
  firm_name: string;
  proprietor_name: string | null;
  business_type: string | null;
  years_in_business: number | null;
  primary_metal_focus: string | null;
  monthly_turnover_range: string | null;
  city: string | null;
  state: string | null;
  warehouse_address: string | null;
  gstin: string | null;
  pan_number: string | null;
};

const TIERS = [
  {
    tier: "Bronze",
    rate: "0.25%",
    perks: "Bottom-line commission · email support",
  },
  {
    tier: "Silver",
    rate: "0.35%",
    perks: "Priority dispatch · monthly rate cards",
  },
  {
    tier: "Gold",
    rate: "0.50%",
    perks: "Dedicated churn desk · 10-day credit",
  },
  {
    tier: "Platinum",
    rate: "0.75%",
    perks: "Custom minting · 30-day credit · personal manager",
  },
];

function Settings() {
  const { dbUser, dealer, user } = useAuth();
  const [firm, setFirm] = useState<Firm | null>(null);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [template, setTemplate] = useState<string>("default");
  const [saving, setSaving] = useState<null | "prefs" | "template">(null);
  const [rewardsOpen, setRewardsOpen] = useState(false);

  useEffect(() => {
    const loadFirm = async () => {
      if (!dealer?.firm_id) return;
      const { data } = await supabase
        .from("firms")
        .select("*")
        .eq("id", dealer.firm_id)
        .maybeSingle();
      if (data) setFirm(data as unknown as Firm);
    };
    void loadFirm();
  }, [dealer?.firm_id]);

  useEffect(() => {
    const meta = user?.user_metadata ?? {};
    const appPrefs = (meta.app_prefs ?? {}) as Record<string, boolean>;
    setPrefs({
      rateAlerts: appPrefs.rateAlerts ?? true,
      orderUpdates: appPrefs.orderUpdates ?? true,
      payments: appPrefs.payments ?? true,
    });
    setTemplate((meta.invoiceTemplate as string) ?? "default");
  }, [user]);

  const savePrefs = async (next: Record<string, boolean>) => {
    setPrefs(next);
    setSaving("prefs");
    const { error } = await supabase.auth.updateUser({
      data: { app_prefs: next },
    });
    setSaving(null);
    if (error) {
      toast.error("Unable to save notification preferences.");
      return;
    }
    toast.success("Notification preferences saved.");
  };

  const saveTemplate = async (value: string) => {
    setTemplate(value);
    setSaving("template");
    const { error } = await supabase.auth.updateUser({
      data: { invoiceTemplate: value },
    });
    setSaving(null);
    if (error) {
      toast.error("Unable to save invoice template.");
      return;
    }
    toast.success("Invoice template saved.");
  };

  const row = (label: string, value: string | null | undefined) => (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-[var(--surface-2)]/60 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-sm">{value || "—"}</span>
    </div>
  );

  return (
    <AppShell>
      <PageTitle title="Settings" subtitle="Your firm, account and preferences" />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Firm profile */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-[var(--platinum)]" /> Firm profile
          </div>
          <div className="mt-4 space-y-3">
            {row("Firm name", firm?.firm_name)}
            {row("Proprietor", firm?.proprietor_name)}
            {row(
              "Business type",
              firm?.business_type ? firm.business_type.replace(/_/g, " ") : null,
            )}
            {row("City · State", firm?.city && firm?.state ? `${firm.city} · ${firm.state}` : null)}
            {row("GSTIN", firm?.gstin)}
            {row("PAN", firm?.pan_number)}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Change requests are handled by your compliance officer at support@bombaysilvers.com.
          </p>
        </GlassCard>

        {/* Dealer account */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <User className="h-3.5 w-3.5 text-[var(--platinum)]" /> Dealer account
          </div>
          <div className="mt-4 space-y-3">
            {row("Dealer ID", dealer?.dealer_code)}
            {row("Referral code", dealer?.referral_code)}
            {row("Name", dbUser?.full_name)}
            {row("Email", dbUser?.email)}
            {row("Phone", dbUser?.phone)}
            {row("Status", dealer?.status ? dealer.status.replace(/_/g, " ") : null)}
            {row(
              "Tier",
              dealer?.tier ? dealer.tier.charAt(0).toUpperCase() + dealer.tier.slice(1) : null,
            )}
            {row(
              "Credit limit",
              dealer?.credit_limit != null
                ? `₹${dealer.credit_limit.toLocaleString("en-IN")}`
                : null,
            )}
            {row(
              "Current balance",
              dealer?.current_balance != null
                ? `₹${dealer.current_balance.toLocaleString("en-IN")}`
                : null,
            )}
          </div>
        </GlassCard>
      </div>

      {/* Notification preferences */}
      <GlassCard className="mt-6 p-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Bell className="h-3.5 w-3.5 text-[var(--platinum)]" /> Notification preferences
          {saving === "prefs" && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              key: "rateAlerts" as const,
              label: "Rate alerts",
              hint: "When gold/silver crosses your threshold",
            },
            {
              key: "orderUpdates" as const,
              label: "Order updates",
              hint: "Confirmation, dispatch and delivery",
            },
            {
              key: "payments" as const,
              label: "Payments",
              hint: "Ledger debits, credits and due reminders",
            },
          ].map((opt) => (
            <label
              key={opt.key}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-4"
            >
              <div>
                <div className="text-sm">{opt.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{opt.hint}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!prefs[opt.key]}
                onClick={() => savePrefs({ ...prefs, [opt.key]: !prefs[opt.key] })}
                className={
                  "mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors " +
                  (prefs[opt.key]
                    ? "border-[var(--gain)]/50 bg-[var(--gain)]/80"
                    : "border-border bg-[var(--surface-3)]")
                }
              >
                <span
                  className={
                    "block h-5 w-5 rounded-full bg-white transition-transform " +
                    (prefs[opt.key] ? "translate-x-5" : "translate-x-0.5")
                  }
                />
              </button>
            </label>
          ))}
        </div>
      </GlassCard>

      {/* Invoice template + rewards */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Receipt className="h-3.5 w-3.5 text-[var(--platinum)]" /> Invoice template
            {saving === "template" && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
          </div>
          <select
            value={template}
            onChange={(e) => void saveTemplate(e.target.value)}
            className="mt-4 h-10 w-full rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm outline-none"
          >
            <option value="default">Default — GST compliant</option>
            <option value="minimal">Minimal — no letterhead</option>
            <option value="detailed">Detailed — rates &amp; itemised weights</option>
          </select>
          <p className="mt-3 text-xs text-muted-foreground">
            Applies to new invoices generated from your orders. Existing PDFs are unchanged.
          </p>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5 text-[var(--platinum)]" /> Dealer tiers &amp; reward
            rates
          </div>
          {rewardsOpen ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Tier</th>
                    <th className="p-3 text-left">Reward rate</th>
                    <th className="p-3 text-left">Perks</th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((t) => (
                    <tr key={t.tier} className="border-b border-border/40 last:border-0">
                      <td className="p-3 font-medium">{t.tier}</td>
                      <td className="p-3 font-mono text-sm">{t.rate}</td>
                      <td className="p-3 text-xs text-muted-foreground">{t.perks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <button
              onClick={() => setRewardsOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-2 text-sm hover:bg-[var(--surface-3)]"
            >
              View tier &amp; reward rates <Check className="h-3.5 w-3.5" />
            </button>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Your earned commission is applied to ledger credits automatically each month.
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
