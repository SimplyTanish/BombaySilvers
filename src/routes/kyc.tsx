import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BrandMark } from "@/components/AppShell";
import { Check, FileText, Upload, ShieldCheck, Clock, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/kyc")({
  head: () => ({ meta: [{ title: "KYC · Bombay Silvers" }] }),
  component: KYC,
});

const docs = [
  { name: "PAN Card", meta: "AAECM1234K", status: "verified" },
  { name: "GST Certificate", meta: "24AAECM1234K1Z9", status: "verified" },
  { name: "Aadhaar (Proprietor)", meta: "XXXX-XXXX-8821", status: "verified" },
  { name: "Bank statement — last 6 mo", meta: "HDFC · A/c ****4421", status: "processing" },
  { name: "Cancelled cheque", meta: "Awaiting upload", status: "pending" },
  { name: "Trade license", meta: "Municipal · Surat", status: "pending" },
];

function KYC() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const handleSkip = async () => {
    setSkipping(true);
    await supabase.auth.updateUser({ data: { kyc_status: "skipped" } });
    setSkipping(false);
    navigate({ to: "/dashboard" });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await supabase.auth.updateUser({ data: { kyc_status: "submitted" } });
    setSubmitting(false);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <BrandMark />
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-[var(--surface-2)] px-3 py-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--gain)]" /> Bank-grade encryption
          </span>
        </div>

        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Step 3 of 4
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">KYC & documents</h1>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                Upload statutory documents. Each file is encrypted at rest and only
                accessible by compliance officers.
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <div className="metallic-text font-mono text-2xl font-semibold">4 / 6</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                verified
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {docs.map((d) => (
              <div
                key={d.name}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border/60 bg-[var(--surface-2)]/70 p-4"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--surface-3)]">
                  <FileText className="h-5 w-5 text-[var(--platinum)]" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{d.name}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    {d.meta}
                  </div>
                </div>
                <StatusPill status={d.status} />
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-[var(--surface-2)]/40 p-6 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[var(--surface-3)]">
              <Upload className="h-5 w-5 text-[var(--platinum)]" />
            </div>
            <div className="mt-3 text-sm">Drop remaining documents here</div>
            <div className="mt-1 text-xs text-muted-foreground">
              PDF, JPG, PNG · up to 10 MB each
            </div>
          </div>

          {/* Skip for now notice */}
          <div className="mt-6 rounded-xl border border-[var(--warn)]/30 bg-[var(--warn)]/8 p-4">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[var(--warn)]">KYC required for major features</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Without KYC, you can browse the terminal but <strong>cannot</strong> place orders, view the
                  ledger, download invoices, or access the referral programme. You can complete KYC
                  anytime from Settings.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-6">
            {/* Skip for now */}
            <button
              onClick={handleSkip}
              disabled={skipping}
              className="flex items-center gap-1.5 rounded-lg border border-border/70 px-4 py-2 text-sm text-muted-foreground hover:bg-[var(--surface-2)] hover:text-foreground disabled:opacity-60"
            >
              {skipping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              Skip for now
            </button>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-5 py-2.5 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Submit for review <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string }> = {
    verified: {
      c: "text-[var(--gain)] border-[var(--gain)]/30 bg-[var(--gain)]/10",
      label: "Verified",
    },
    processing: {
      c: "text-[var(--warn)] border-[var(--warn)]/30 bg-[var(--warn)]/10",
      label: "Processing",
    },
    pending: {
      c: "text-muted-foreground border-border/60 bg-[var(--surface-3)]",
      label: "Pending",
    },
  };
  const s = map[status];
  return (
    <span
      className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] " + s.c}
    >
      {status === "verified" && <Check className="h-3 w-3" />}
      {s.label}
    </span>
  );
}
