import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Boxes,
  ScrollText,
  Receipt,
  Users2,
  Shield,
  Gift,
  LineChart,
  Smartphone,
  KeyRound,
  UserCheck,
  FileCheck2,
  ArrowRight,
} from "lucide-react";
import { BrandMark, LiveDot } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bombay Silvers — Dealer Terminal" },
      {
        name: "description",
        content:
          "The operating system of the Bombay Silvers dealer network. A premium bullion trading terminal for wholesalers, distributors and staff.",
      },
      { property: "og:title", content: "Bombay Silvers — Dealer Terminal" },
      {
        property: "og:description",
        content: "A Bloomberg-terminal-class platform for a 40-year bullion wholesaler.",
      },
    ],
  }),
  component: Gallery,
});

const groups: {
  title: string;
  items: {
    to: string;
    label: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}[] = [
  {
    title: "Authentication & Onboarding",
    items: [
      { to: "/login", label: "Login", desc: "Mobile-first sign in", icon: Smartphone },
      { to: "/otp", label: "OTP Verification", desc: "6-digit challenge", icon: KeyRound },
      {
        to: "/onboarding",
        label: "Dealer Onboarding",
        desc: "Firm & profile setup",
        icon: UserCheck,
      },
      { to: "/kyc", label: "KYC Submission", desc: "PAN · GST · docs", icon: FileCheck2 },
    ],
  },
  {
    title: "Dealer Platform",
    items: [
      {
        to: "/dashboard",
        label: "Dashboard",
        desc: "Live rates & positions",
        icon: LayoutDashboard,
      },
      { to: "/inventory", label: "Inventory", desc: "Bars, coins, purity", icon: Boxes },
      { to: "/orders", label: "Orders", desc: "Placement & tracking", icon: ScrollText },
      { to: "/ledger", label: "Ledger", desc: "Balance & statements", icon: LineChart },
      { to: "/invoices", label: "Invoices", desc: "PDF history", icon: Receipt },
      { to: "/referrals", label: "Referrals", desc: "Dealer network growth", icon: Gift },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/admin", label: "Admin Dashboard", desc: "Rates · dealers · analytics", icon: Users2 },
      {
        to: "/security",
        label: "Security Settings",
        desc: "Devices · sessions · audit",
        icon: Shield,
      },
    ],
  },
];

function Gallery() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-border/60">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,oklch(0.9_0.02_260/0.25),transparent)]" />
        <div className="pointer-events-none absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.14_85/0.15),transparent)]" />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-8 lg:pb-24 lg:pt-12">
          <div className="flex items-center justify-between">
            <BrandMark />
            <LiveDot label="Live Platform" />
          </div>

          <div className="mt-16 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-[var(--surface-2)]/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
              40+ Years · Nationwide Bullion Network
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="metallic-text">A Bloomberg terminal,</span>
              <br />
              built for bullion.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              The dealer operating system of Bombay Silvers — live gold & silver rates, wholesale
              inventory, order flow, ledger, invoicing and referrals. Institutional-grade.
              Mobile-first. India today, Dubai and Monaco tomorrow.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-5 py-3 text-sm font-medium text-black shadow-[0_10px_30px_-10px_rgba(255,255,255,0.25),inset_0_1px_0_rgba(255,255,255,0.7)] transition-transform hover:-translate-y-0.5"
              >
                Enter the terminal
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-[var(--surface-2)]/60 px-5 py-3 text-sm text-foreground hover:bg-[var(--surface-3)]"
              >
                View login flow
              </Link>
            </div>

            <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                ["40+", "Years of trust"],
                ["1,200+", "Active dealers"],
                ["₹100 Cr+", "Monthly turnover"],
                ["28", "States served"],
              ].map(([v, l]) => (
                <div key={l}>
                  <div className="metallic-text font-mono text-2xl font-semibold">{v}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                    {l}
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </header>

      {/* Gallery */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Platform Map
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Every surface of the platform
            </h2>
          </div>
          <div className="hidden text-xs text-muted-foreground sm:block">
            Click any tile to open the full screen
          </div>
        </div>

        <div className="space-y-12">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {g.title}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map(({ to, label, desc, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group glass relative overflow-hidden rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
                  >
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(closest-side,oklch(0.9_0.02_260/0.15),transparent)] opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl border border-border/70 bg-[var(--surface-2)]">
                        <Icon className="h-5 w-5 text-[var(--platinum)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{label}</div>
                        <div className="truncate text-xs text-muted-foreground">{desc}</div>
                      </div>
                      <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-20 border-t border-border/60 pt-8 text-center text-xs text-muted-foreground">
          Bombay Silvers Dealer Terminal · Bombay Silvers © {new Date().getFullYear()}
        </footer>
      </section>
    </div>
  );
}
