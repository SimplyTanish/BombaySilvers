import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/AppShell";
import { ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/otp")({
  head: () => ({ meta: [{ title: "Verify OTP · Bombay Silvers" }] }),
  component: OTP,
});

function OTP() {
  const digits = ["4", "8", "2", "1", "", ""];
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <BrandMark />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Step 2 / 2
          </span>
        </div>

        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-[var(--surface-2)] px-3 py-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--gain)]" />
            One-time password sent
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Enter 6-digit OTP</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We sent a code to <span className="text-foreground">+91 98204 12876</span>.
          </p>

          <div className="mt-8 grid grid-cols-6 gap-2 sm:gap-3">
            {digits.map((d, i) => (
              <div
                key={i}
                className={
                  "grid aspect-square place-items-center rounded-xl border font-mono text-2xl font-semibold " +
                  (d
                    ? "border-[var(--silver-muted)] bg-[var(--surface-3)] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "border-border/60 bg-[var(--surface-2)] text-muted-foreground")
                }
              >
                {d || <span className="h-4 w-2 animate-pulse bg-[var(--silver)]/60" />}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="font-mono text-muted-foreground">Resend in 00:24</span>
            <button className="text-foreground underline underline-offset-4">Change number</button>
          </div>

          <Link
            to="/dashboard"
            className="mt-8 flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
          >
            Verify & enter terminal <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="mt-6 rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-3 text-[11px] text-muted-foreground">
            <div className="font-mono uppercase tracking-widest text-[10px] text-[var(--platinum)]">Session details</div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <span>Device</span><span className="text-right text-foreground">iPhone 15 Pro · Mumbai</span>
              <span>IP</span><span className="text-right font-mono text-foreground">103.24.xx.xx</span>
              <span>Expires</span><span className="text-right text-foreground">in 8 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
