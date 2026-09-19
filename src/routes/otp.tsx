import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/AppShell";
import { ShieldCheck, ArrowRight, Loader2, Mail, Sparkles } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/lib/supabase";
import { DEMO_MODE, demoGetOtp, saveDealerProfile } from "@/lib/auth-fns";

export const Route = createFileRoute("/otp")({
  head: () => ({ meta: [{ title: "Verify OTP · Bombay Silvers" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : "",
    phone: typeof search.phone === "string" ? search.phone : "",
    trust: search.trust === true || search.trust === "true",
    flow: search.flow === "register" ? "register" : ("login" as "login" | "register"),
  }),
  component: OTP,
});

/** Mask an email: rahul@gmail.com → r***l@g***.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || local.length < 2) return email;
  const [domainName, ...rest] = domain.split(".");
  const maskedLocal = local[0] + "*".repeat(Math.max(local.length - 2, 1)) + local.slice(-1);
  const maskedDomain = domainName[0] + "*".repeat(Math.max(domainName.length - 1, 1));
  return `${maskedLocal}@${maskedDomain}.${rest.join(".")}`;
}

function OTP() {
  const navigate = useNavigate();
  const { email, phone, trust, flow } = Route.useSearch();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("demo_otp");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { otp?: string; flow?: string; email?: string };
      if (
        typeof parsed.otp === "string" &&
        parsed.otp.length === 6 &&
        parsed.flow === flow &&
        parsed.email === email
      ) {
        sessionStorage.removeItem("demo_otp");
        const code = parsed.otp;
        setDemoOtp(code);
        setOtp((cur) => cur || code);
      } else {
        sessionStorage.removeItem("demo_otp");
      }
    } catch {
      sessionStorage.removeItem("demo_otp");
    }
  }, [flow, email]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const displayPhone = phone
    ? `+91 ${phone.replace("+91", "").replace(/(\d{5})(\d{5})/, "$1 $2")}`
    : null;
  const displayEmail = email ? maskEmail(email) : "your registered email";

  const handleVerify = async () => {
    if (otp.length < 6 || !email) return;
    setLoading(true);
    setError(null);

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (verifyErr) {
      setLoading(false);
      setError(verifyErr.message);
      setOtp("");
      return;
    }

    sessionStorage.removeItem("demo_otp");

    // Registration flow: save dealer profile from sessionStorage
    if (flow === "register") {
      try {
        const raw = sessionStorage.getItem("dealer_draft");
        if (raw) {
          const draft = JSON.parse(raw) as Record<string, unknown>;
          const { data: userData } = await supabase.auth.getUser();
          await saveDealerProfile({
            data: {
              ...draft,
              user_id: userData.user?.id ?? "",
              phone,
              email,
            },
          });
          sessionStorage.removeItem("dealer_draft");
        }
        // Mark KYC as not started in user metadata
        await supabase.auth.updateUser({ data: { kyc_status: "none" } });
      } catch {
        // Non-fatal — user is authenticated, profile save will retry
      }
      setLoading(false);
      navigate({ to: "/kyc" });
      return;
    }

    setLoading(false);
    navigate({ to: "/dashboard" });
  };

  const handleResend = async () => {
    if (countdown > 0 || resending || !email) return;
    setResending(true);
    setError(null);
    if (DEMO_MODE) {
      const res = await demoGetOtp({ data: { flow, email } });
      if ("error" in res) {
        setError(res.error);
      } else {
        setOtp(res.otp);
        setDemoOtp(res.otp);
        sessionStorage.setItem("demo_otp", JSON.stringify({ otp: res.otp, flow, email }));
      }
      setResending(false);
      setCountdown(60);
      return;
    }
    const { error: resendErr } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: flow === "register" },
    });
    setResending(false);
    if (resendErr) {
      setCountdown(60);
      setError(resendErr.message && resendErr.message !== "{}"
        ? resendErr.message
        : "Too many requests — please wait a minute and try again.");
      return;
    }
    setCountdown(60);
    setOtp("");
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <BrandMark />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {flow === "register" ? "Registration" : "Sign in"} · Step 2
          </span>
        </div>

        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-[var(--surface-2)] px-3 py-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--gain)]" />
            One-time code sent
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Enter 6-digit code</h1>

          <div className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--platinum)]" />
            <span>
              We emailed a code to <span className="font-mono text-foreground">{displayEmail}</span>
              {displayPhone && (
                <span className="ml-1 text-muted-foreground">
                  (account linked to {displayPhone})
                </span>
              )}
            </span>
          </div>

          {DEMO_MODE && demoOtp && (
            <div className="mt-4 rounded-xl border border-[var(--gain)]/40 bg-[var(--gain)]/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--gain)]">
                <Sparkles className="h-3.5 w-3.5" />
                Demo preview · no email required
              </div>
              <div className="mt-2 text-center font-mono text-2xl font-bold tracking-[0.3em] text-foreground">
                {demoOtp}
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                In production this code arrives in the buyer's inbox. It's shown here so you can
                walk through the real flow end-to-end.
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(val) => {
                setOtp(val);
                setError(null);
              }}
              onComplete={DEMO_MODE ? undefined : handleVerify}
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
              disabled={countdown > 0 || resending}
              className="font-mono text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {countdown > 0
                ? `Resend in 00:${String(countdown).padStart(2, "0")}`
                : resending
                  ? "Sending…"
                  : "Resend code"}
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
                {flow === "register" ? "Verify & continue" : "Verify & enter terminal"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="mt-6 rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-3 text-[11px] text-muted-foreground">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--platinum)]">
              Session details
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <span>Auth method</span>
              <span className="text-right text-foreground">Email OTP</span>
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
