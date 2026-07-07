import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/AppShell";
import { Check, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Dealer Onboarding · Bombay Silvers" }] }),
  component: Onboarding,
});

const steps = [
  { n: 1, label: "Firm details", done: true },
  { n: 2, label: "Business profile", active: true },
  { n: 3, label: "KYC & documents" },
  { n: 4, label: "Review & submit" },
];

function Onboarding() {
  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <BrandMark />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Application #BS-24-08871</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* stepper */}
          <aside className="glass h-fit rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Progress</div>
            <div className="mt-4 space-y-1">
              {steps.map((s) => (
                <div
                  key={s.n}
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 " +
                    (s.active ? "bg-[var(--surface-3)]" : "")
                  }
                >
                  <div
                    className={
                      "grid h-7 w-7 place-items-center rounded-full font-mono text-xs " +
                      (s.done
                        ? "bg-[var(--gain)]/20 text-[var(--gain)]"
                        : s.active
                          ? "bg-gradient-to-br from-[#e9e9ec] to-[#8b8c90] text-black"
                          : "border border-border bg-[var(--surface-2)] text-muted-foreground")
                    }
                  >
                    {s.done ? <Check className="h-3.5 w-3.5" /> : s.n}
                  </div>
                  <span className={"text-sm " + (s.active || s.done ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-3 text-[11px] text-muted-foreground">
              Applications are usually approved within 2 business days. Our relationship manager will call you.
            </div>
          </aside>

          {/* form */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Step 2 of 4</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Business profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us about your bullion operations. This helps us set your credit limits and inventory access tier.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <Field label="Firm name" value="Mehta Bullion Traders" />
              <Field label="Proprietor / director" value="Rahul K. Mehta" />
              <Field label="Business type" value="Wholesale · HUF" />
              <Field label="Years in business" value="18 years" />
              <Field label="Primary metal focus" value="Silver 999 · Gold coins" />
              <Field label="Monthly turnover (approx)" value="₹4.2 Cr" />
              <Field label="City" value="Surat" />
              <Field label="State" value="Gujarat" />
              <div className="sm:col-span-2">
                <Field
                  label="Warehouse address"
                  value="14, Zaveri Bazaar, Mahidharpura, Surat 395003"
                  full
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-6">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
              <Link
                to="/kyc"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-5 py-2.5 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
              >
                Continue to KYC <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-full" : ""}>
      <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        defaultValue={value}
        className="h-11 w-full rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 text-sm outline-none focus:border-[var(--silver-muted)]"
      />
    </div>
  );
}
