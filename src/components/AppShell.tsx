import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Boxes,
  ScrollText,
  Receipt,
  Users2,
  Settings,
  Shield,
  Gift,
  LineChart,
  Menu,
  LogOut,
  ClipboardCheck,
  Warehouse,
  ContactRound,
} from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useAuth } from "@/hooks/use-auth";
import { useLiveRates } from "@/hooks/use-live-rates";
import { fmtINR, fmtChange } from "@/lib/rates";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/orders", label: "Orders", icon: ScrollText },
  { to: "/ledger", label: "Ledger", icon: LineChart },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/referrals", label: "Referrals", icon: Gift },
] as const;

const adminNav = [
  { to: "/admin", label: "Admin", icon: Users2 },
  { to: "/security", label: "Security", icon: Shield },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const staffNav = [
  { to: "/staff/orders", label: "Order queue", icon: ClipboardCheck },
  { to: "/staff/inventory", label: "Stock control", icon: Warehouse },
  { to: "/staff/dealers", label: "Dealer lookup", icon: ContactRound },
] as const;

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#e9e9ec] via-[#b8b9bd] to-[#6d6e72] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_20px_-8px_rgba(0,0,0,0.8)]">
        <span className="font-mono text-[13px] font-bold text-black/80">BS</span>
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="metallic-text text-[15px] font-semibold tracking-tight">
            Bombay Silvers
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Dealer Terminal · Est. 1984
          </div>
        </div>
      )}
    </div>
  );
}

export function RateTicker() {
  // Pull live gold & silver into the ticker; the rest stay static.
  const { data } = useLiveRates();

  const goldPrice = data ? fmtINR(data.gold.priceINR) : "—";
  const goldDelta = data ? fmtChange(data.gold.changeAbs) : "—";
  const goldUp = data ? data.gold.up : true;

  const silverPrice = data ? fmtINR(data.silver.priceINR) : "—";
  const silverDelta = data ? fmtChange(data.silver.changeAbs) : "—";
  const silverUp = data ? data.silver.up : false;

  const items = [
    { s: "GOLD 999", p: goldPrice, d: goldDelta, up: goldUp, prefix: "₹" },
    { s: "GOLD 995", p: "71,860", d: "+310", up: true, prefix: "₹" },
    { s: "SILVER 999", p: silverPrice, d: silverDelta, up: silverUp, prefix: "₹" },
    { s: "PLATINUM", p: "31,200", d: "+18", up: true, prefix: "₹" },
    { s: "MCX GOLD", p: "72,205", d: "+289", up: true, prefix: "₹" },
    { s: "USD/INR", p: "83.42", d: "-0.06", up: false, prefix: "" },
    { s: "LBMA AM", p: "2,342", d: "+8.20", up: true, prefix: "$" },
  ];

  const row = (key: string) => (
    <div key={key} className="flex shrink-0 items-center gap-8 pr-8 font-mono text-[12px]">
      {items.map((i, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-muted-foreground">{i.s}</span>
          <span className="text-foreground">
            {i.prefix}
            {i.p}
          </span>
          <span style={{ color: i.up ? "var(--gain)" : "var(--loss)" }}>{i.d}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="relative flex overflow-hidden border-y border-border/60 bg-[var(--surface-1)]/60 py-2">
      <div className="flex animate-[ticker_45s_linear_infinite] whitespace-nowrap">
        {row("a")}
        {row("b")}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}

export function LiveDot({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--gain)] shadow-[0_0_8px_var(--gain)] [animation:pulse-dot_1.6s_ease-in-out_infinite]" />
      {label}
    </span>
  );
}

// Shared sidebar nav — rendered in both desktop sidebar and mobile Sheet.
function SidebarNav({
  pathname,
  user,
  onSignOut,
  onNav,
  role,
}: {
  pathname: string;
  user: { phone?: string | null; email?: string | null } | null;
  onSignOut: () => void;
  onNav?: () => void;
  role: string | null;
}) {
  const displayName = user?.phone
    ? user.phone.replace("+91", "+91 ").replace(/(\+91 )(\d{5})(\d{5})/, "$1$2 $3")
    : (user?.email ?? "Dealer");

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="px-1 pb-4">
        <BrandMark />
      </div>
      <div className="px-1 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Trading
      </div>
      <nav className="flex flex-col gap-0.5">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              onClick={onNav}
              className={
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
                (active
                  ? "bg-[var(--surface-3)] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-muted-foreground hover:bg-[var(--surface-2)] hover:text-foreground")
              }
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      {(role === "staff" || role === "admin" || role === "super_admin") && (
        <>
          <div className="mt-4 px-1 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Operations
          </div>

          <nav className="flex flex-col gap-0.5">
            {staffNav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;

              return (
                <Link
                  key={to}
                  to={to}
                  onClick={onNav}
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
                    (active
                      ? "bg-[var(--surface-3)] text-foreground"
                      : "text-muted-foreground hover:bg-[var(--surface-2)] hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}
      {(role === "admin" || role === "super_admin") && (
        <>
          <div className="mt-4 px-1 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Operations
          </div>

          <nav className="flex flex-col gap-0.5">
            {adminNav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;

              return (
                <Link
                  key={to}
                  to={to}
                  onClick={onNav}
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
                    (active
                      ? "bg-[var(--surface-3)] text-foreground"
                      : "text-muted-foreground hover:bg-[var(--surface-2)] hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}
      <div className="mt-auto space-y-2">
        <div className="rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#d9d9dd] to-[#7a7b7f] font-mono text-[11px] font-bold text-black">
              {displayName.slice(-2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{displayName}</div>
              <div className="truncate text-[11px] text-muted-foreground">Dealer account</div>
            </div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
        <button
          onClick={onMenuClick}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-[var(--surface-2)] lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="lg:hidden">
          <BrandMark compact />
        </div>
        <LiveDot label="Market Open" />
        <NotificationCenter />
      </div>
      <RateTicker />
    </div>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = nav.slice(0, 5);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link key={to} to={to} className="flex flex-1 flex-col items-center gap-1 py-1">
              <Icon
                className={"h-5 w-5 " + (active ? "text-foreground" : "text-muted-foreground")}
              />
              <span
                className={"text-[10px] " + (active ? "text-foreground" : "text-muted-foreground")}
              >
                {label}
              </span>
              {active && (
                <span className="h-0.5 w-6 rounded-full bg-gradient-to-r from-transparent via-[var(--platinum)] to-transparent" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session, user, role, loading, signOut } = useAuth();

  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth guard — redirect to login if no session once loading resolves.
  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login" });
    }
  }, [loading, session, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  // Render a minimal blank screen while checking auth to avoid flash.
  if (loading || !session) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-[248px] flex-none flex-col border-r border-border/60 bg-[var(--surface-1)]/60 lg:flex">
          <SidebarNav pathname={pathname} user={user} onSignOut={handleSignOut} role={role} />
        </aside>

        {/* Mobile sidebar — Sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-[248px] p-0 border-r border-border/60 bg-[var(--surface-1)]"
          >
            <SidebarNav
              pathname={pathname}
              user={user}
              onSignOut={handleSignOut}
              onNav={() => setSidebarOpen(false)}
              role={role}
            />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="px-4 pb-28 pt-6 lg:px-8 lg:pb-10">{children}</main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={"glass rounded-2xl " + className}>{children}</div>;
}
