import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { BrandMark } from "@/components/AppShell";
import { ArrowRight, ShieldCheck, Loader2, WifiOff, LockKeyhole } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEMO_MODE, demoGetOtp, lookupEmailByPhone } from "@/lib/auth-fns";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Bombay Silvers" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const cleaned = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (cleaned.length < 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    const fullPhone = `+91${cleaned}`;
    setLoading(true);
    setError(null);
    setNotRegistered(false);

    // Look up email registered to this phone number
    const result = await lookupEmailByPhone({ data: { phone: fullPhone } });
    if (!result.found) {
      setLoading(false);
      setNotRegistered(true);
      return;
    }

    // Email found → send email OTP (works without Twilio/SMS)
    let otp: string | undefined;
    let otpErr: string | null = null;

    if (DEMO_MODE) {
      const res = await demoGetOtp({ data: { flow: "login", email: result.email } });
      if ("error" in res) {
        otpErr = res.error;
      } else {
        otp = res.otp;
      }
    } else {
      const res = await supabase.auth.signInWithOtp({
        email: result.email,
        options: { shouldCreateUser: false },
      });
      otpErr = res.error?.message ?? null;
    }

    setLoading(false);
    if (otpErr) {
      setError(otpErr);
      return;
    }

    if (otp)
      sessionStorage.setItem(
        "demo_otp",
        JSON.stringify({ otp, flow: "login", email: result.email }),
      );

    navigate({
      to: "/otp",
      search: {
        email: result.email,
        phone: fullPhone,
        trust: trustDevice,
        flow: "login",
      },
    });
  };

  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword) {
      setError("Enter your staff email and password.");
      return;
    }
    setAdminLoading(true);
    setError(null);

    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (error) {
      setAdminLoading(false);
      setError(error.message);
      return;
    }

    const userId = signInData.user?.id;
    let role = "dealer";
    if (userId) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      role = dbUser?.role ?? "dealer";
    }
    setAdminLoading(false);

    switch (role) {
      case "admin":
      case "super_admin":
        navigate({ to: "/admin" });
        break;
      case "staff":
        navigate({ to: "/staff/orders" });
        break;
      default:
        navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand pane */}
      <div className="relative hidden overflow-hidden border-r border-border/60 lg:block">
        <div className="grid-lines absolute inset-0 opacity-40" />
        <div className="absolute -left-40 top-1/3 h-[560px] w-[560px] rounded-full bg-[radial-gradient(closest-side,oklch(0.9_0.02_260/0.2),transparent)]" />
        <div className="absolute inset-0 flex flex-col justify-between p-10">
          <BrandMark />
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              A Bloomberg terminal for bullion
            </div>
            <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight tracking-tight">
              <span className="metallic-text">Trust. Scale.</span>
              <br />
              Since 1984.
            </h2>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              The private dealer terminal of Bombay Silvers — used by wholesalers, distributors and
              staff across 28 states.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-[var(--surface-2)]/60 px-3 py-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--gain)]" />
              Bank-grade encryption · Device-bound sessions
            </div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            v1.0 · India → Dubai → Monaco
          </div>
        </div>
      </div>

      {/* Form pane */}
      <div className="relative flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="glass rounded-3xl p-6 sm:p-8">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Dealer sign in
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome back.
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your registered mobile number to continue.
              </p>

              <div className="mt-8 space-y-4">
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Mobile number
                </label>
                <div className="flex items-stretch gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 font-mono text-sm">
                    🇮🇳 +91
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError(null);
                      setNotRegistered(false);
                    }}
                    placeholder="98765 43210"
                    maxLength={11}
                    autoFocus
                    className="h-12 flex-1 rounded-xl border border-border/70 bg-[var(--surface-2)] px-4 font-mono text-lg tracking-wider outline-none focus:border-[var(--silver-muted)]"
                  />
                </div>

                {/* Error */}
                {error && (
                  <p className="rounded-lg border border-[var(--loss)]/30 bg-[var(--loss)]/10 px-3 py-2 text-xs text-[var(--loss)]">
                    {error}
                  </p>
                )}

                {/* Not registered state */}
                {notRegistered && (
                  <div className="rounded-xl border border-[var(--warn)]/30 bg-[var(--warn)]/8 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--warn)]">
                      <WifiOff className="h-4 w-4" />
                      Number not registered
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      This mobile number isn't linked to a dealer account. Apply below to get
                      access.
                    </p>
                    <Link
                      to="/onboarding"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1.5 text-xs text-foreground hover:bg-[var(--surface-3)]"
                    >
                      Apply as a dealer <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}

                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[var(--silver)]"
                  />
                  Trust this device for 30 days
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>

                <div className="mt-6 text-center text-xs text-muted-foreground">
                  New to Bombay Silvers?{" "}
                  <Link to="/onboarding" className="text-foreground underline underline-offset-4">
                    Apply as a dealer
                  </Link>
                </div>
              </div>
            </div>
          </form>

          {/* Staff & admin portal — intentionally separate from the dealer path.
              Dealers authenticate via mobile OTP / dealer ID above; staff and
              admins use email + password here. */}
          <div className="mt-6 rounded-3xl border border-border/60 bg-[var(--surface-1)]/40 p-4">
            {!adminOpen ? (
              <button
                type="button"
                onClick={() => {
                  setAdminOpen(true);
                  setError(null);
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-[var(--surface-2)] text-sm text-foreground hover:bg-[var(--surface-3)]"
              >
                <LockKeyhole className="h-4 w-4 text-[var(--platinum)]" />
                Staff &amp; admin login
              </button>
            ) : (
              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Staff &amp; admin portal
                </div>
                <input
                  type="email"
                  placeholder="staff@bombaysilvers.com"
                  value={adminEmail}
                  onChange={(e) => {
                    setAdminEmail(e.target.value);
                    setError(null);
                  }}
                  className="mb-3 h-11 w-full rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 text-sm outline-none focus:border-[var(--silver-muted)]"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setError(null);
                  }}
                  className="mb-3 h-11 w-full rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 text-sm outline-none focus:border-[var(--silver-muted)]"
                />
                <button
                  type="button"
                  onClick={handleAdminLogin}
                  disabled={adminLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {adminLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Admin Login"}
                </button>
                <button
                  type="button"
                  onClick={() => setAdminOpen(false)}
                  className="mt-2 h-9 w-full rounded-lg border border-border/60 bg-transparent text-xs text-muted-foreground hover:bg-[var(--surface-2)]"
                >
                  Back to dealer sign in
                </button>
              </div>
            )}
            {adminOpen && (
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Staff accounts are provisioned by Bombay Silvers operations. Dealers should use the
                dealer sign-in above.
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Login uses a secure one-time code sent to your registered email.
          </p>
        </div>
      </div>
    </div>
  );
}
