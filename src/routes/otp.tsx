import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BrandMark } from "@/components/AppShell";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/otp")({
  head: () => ({ meta: [{ title: "Verify OTP · Bombay Silvers" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    phone: typeof search.phone === "string" ? search.phone : "",
    trust: search.trust === true || search.trust === "true",
  }),
  component: OTP,
});

function OTP() {
  const navigate = useNavigate();
  const { phone, trust } = Route.useSearch();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [error, setError] = useState<string | null>(null);

  // Start countdown on mount
  useState(() => {
    const interval = setInterval(() => {
      setResendCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  });

  const displayPhone = phone
    ? phone.replace("+91", "").replace(/(\d{5})(\d{5})/, "$1 $2")
    : "your number";

  const handleVerify = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
      setOtp("");
      return;
    }
    navigate({ to: "/dashboard" });
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setResending(true);
    await supabase.auth.signInWithOtp({ phone });
    setResending(false);
    setResendCountdown(30);
    setOtp("");
    setError(null);
    const interval = setInterval(() => {
      setResendCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

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
            We sent a code to{" "}
            <span className="text-foreground">+91 {displayPhone}</span>.
          </p>

          <div className="mt-8 flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(val) => {
                setOtp(val);
                setError(null);
              }}
              onComplete={handleVerify}
            >
              <InputOTPGroup className="gap-2 sm:gap-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-12 w-10 rounded-xl border border-border/70 bg-[var(--surface-2)] font-mono text-2xl font-semibold sm:h-14 sm:w-12 data-[active]:border-[var(--silver-muted)]"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-[var(--loss)]/30 bg-[var(--loss)]/10 px-3 py-2 text-center text-xs text-[var(--loss)]">
              {error}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between text-xs">
            <button
              onClick={handleResend}
              disabled={resendCountdown > 0 || resending}
              className="font-mono text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendCountdown > 0
                ? `Resend in 00:${String(resendCountdown).padStart(2, "0")}`
                : resending
                  ? "Sending…"
                  : "Resend OTP"}
            </button>
            <button
              onClick={() => navigate({ to: "/login" })}
              className="text-foreground underline underline-offset-4"
            >
              Change number
            </button>
          </div>

          <button
            onClick={handleVerify}
            disabled={otp.length < 6 || loading}
            className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Verify & enter terminal <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="mt-6 rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-3 text-[11px] text-muted-foreground">
            <div className="font-mono uppercase tracking-widest text-[10px] text-[var(--platinum)]">Session details</div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <span>Trust device</span>
              <span className="text-right text-foreground">{trust ? "Yes · 30 days" : "No"}</span>
              <span>Expires</span>
              <span className="text-right text-foreground">in 8 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
