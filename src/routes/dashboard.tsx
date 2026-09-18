import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AppShell, GlassCard, LiveDot, PageTitle } from "@/components/AppShell";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  ScrollText,
  Wallet,
  Plus,
  Bell,
  RefreshCw,
  WifiOff,
  Clock,
} from "lucide-react";
import { useLiveRates } from "@/hooks/use-live-rates";
import { useNotifications } from "@/hooks/use-notifications";
import {
  inventoryValue,
  inventoryUnits,
  useInventory,
  type SalesInventoryRow,
} from "@/hooks/use-inventory";
import { fmtINR, fmtChange, fmtPct, generateSparkline } from "@/lib/rates";
import type { MetalRate } from "@/lib/rates";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { inventoryKeys } from "@/hooks/use-inventory";
import { DealerOrderDialog } from "@/components/DealerOrderDialog";
import { ReserveStockDialog } from "@/components/ReserveStockDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Bombay Silvers" }] }),
  component: Dashboard,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(epochMs: number): string {
  const secs = Math.floor((Date.now() - epochMs) / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

type DisplayOrder = { id: string; item: string; status: string; amount: string; date: Date };
type DisplayOrderRow = {
  order_number: string;
  status: string;
  grand_total: number;
  created_at: string;
  order_items: Array<{ quantity: number; products: { name: string } | null }>;
};

function sumUnits(rows: SalesInventoryRow[], metal: string): string {
  const grams = rows
    .filter((row) => row.products?.metal_type === metal)
    .reduce((sum, row) => sum + row.quantity_available * (row.products?.unit_weight_grams ?? 0), 0);
  if (grams === 0) return "0 g";
  if (grams >= 1000)
    return `${(grams / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg`;
  return `${gramFormatter(grams)} g`;
}

function gramFormatter(grams: number): string {
  return grams.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmtUnits(units: number): string {
  return units.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, isFetching, refetch, dataUpdatedAt } = useLiveRates();
  const { data: notifications } = useNotifications();
  const { data: stock = [] } = useInventory();
  const [reserveOpen, setReserveOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<DisplayOrder[]>([]);

  const loadRecentOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "order_number, status, grand_total, created_at, order_items(quantity, products(name))",
      )
      .order("created_at", { ascending: false })
      .limit(4);
    if (error) return;
    setRecentOrders(
      ((data ?? []) as unknown as DisplayOrderRow[]).map((order) => ({
        id: order.order_number,
        item: order.order_items[0]
          ? `${order.order_items[0].products?.name ?? "Product"} · ${order.order_items[0].quantity}`
          : "Order details pending",
        status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
        amount: `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
          order.grand_total,
        )}`,
        date: new Date(order.created_at),
      })),
    );
  }, []);
  useEffect(() => {
    void loadRecentOrders();
  }, [loadRecentOrders]);

  const value = inventoryValue(stock);
  const units = inventoryUnits(stock);
  const warehouses = new Set(stock.map((row) => row.warehouses?.id ?? row.warehouse_id)).size;
  const goldKg = sumUnits(stock, "gold");
  const silverKg = sumUnits(stock, "silver");
  const unread = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <AppShell>
      <PageTitle
        title="Good morning."
        subtitle="Rates update every 5 minutes · MCX Mumbai"
        actions={
          <>
            {data && !isError ? (
              <LiveDot label="Live rates" />
            ) : isError ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--loss)]/40 bg-[var(--loss)]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--loss)]">
                <WifiOff className="h-3 w-3" /> Feed offline
              </span>
            ) : null}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="hidden sm:inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 text-sm hover:bg-[var(--surface-3)] disabled:opacity-50"
              title="Refresh rates now"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setAlertOpen(true)}
              className="hidden sm:inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 text-sm hover:bg-[var(--surface-3)]"
            >
              <Bell className="h-4 w-4" /> Alerts
            </button>
            <button
              onClick={() => setOrderOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-4 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
            >
              <Plus className="h-4 w-4" /> New order
            </button>
          </>
        }
      />

      {/* Last updated chip */}
      {dataUpdatedAt > 0 && (
        <div className="mb-4 text-[11px] text-muted-foreground">
          Rates last updated {timeAgo(dataUpdatedAt)}
          {data?.fromCache && " · served from cache"}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RateCard
          label="Gold 999"
          hint="MCX · per 10g"
          rate={data?.gold}
          isLoading={isLoading}
          isError={isError}
          fallbackPrice="72,148"
          fallbackSeries={FALLBACK_GOLD_SERIES}
        />
        <RateCard
          label="Silver 999"
          hint="MCX · per kg"
          rate={data?.silver}
          isLoading={isLoading}
          isError={isError}
          fallbackPrice="89,420"
          fallbackSeries={FALLBACK_SILVER_SERIES}
        />
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Inventory value
              </div>
              <div className="metallic-text mt-2 font-mono text-3xl font-semibold">
                ₹{fmtINR(value)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Across {warehouses} warehouse{warehouses === 1 ? "" : "s"} · {fmtUnits(units)}
              </div>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--surface-3)]">
              <Boxes className="h-6 w-6 text-[var(--platinum)]" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[
              ["Silver 999", silverKg],
              ["Gold 999", goldKg],
              ["Total units", fmtUnits(units)],
            ].map(([l, v]) => (
              <div
                key={l}
                className="rounded-lg border border-border/60 bg-[var(--surface-2)]/60 py-2"
              >
                <div className="font-mono text-sm">{v}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Quick actions */}
        <GlassCard className="p-5 lg:col-span-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Quick actions
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { i: ScrollText, l: "Place order" },
              { i: Boxes, l: "Reserve stock" },
              { i: Wallet, l: "Pay ledger" },
              { i: Bell, l: "Set rate alert" },
            ].map(({ i: Icon, l }) => (
              <button
                key={l}
                onClick={() => {
                  if (l === "Place order") navigate({ to: "/orders" });
                  if (l === "Reserve stock") setReserveOpen(true);
                  if (l === "Pay ledger") {
                    navigate({ to: "/ledger" });
                    toast.info("Online ledger payments will be available in the next release.");
                  }
                  if (l === "Set rate alert") setAlertOpen(true);
                }}
                className="group flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-4 text-left transition-colors hover:bg-[var(--surface-3)]"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface-3)] transition-transform group-hover:-translate-y-0.5">
                  <Icon className="h-4 w-4 text-[var(--platinum)]" />
                </div>
                <div className="text-sm">{l}</div>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Recent orders */}
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Recent orders
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{recentOrders.length} total</div>
            </div>
            <Link to="/orders" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {recentOrders.length === 0 ? (
              <div className="py-4 text-sm text-muted-foreground">
                No orders yet. Place your first order to get started.
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {order.id}
                    </div>
                    <div className="truncate text-sm">{order.item}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {formatDateTime(order.date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="hidden rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[11px] text-muted-foreground sm:inline-flex">
                      {order.status}
                    </span>
                    <span className="font-mono text-sm">{order.amount}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* Notifications strip */}
      <GlassCard className="mt-6 p-5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Notifications
          </div>
          <span className="text-xs text-muted-foreground">
            {unread === 0 ? "All caught up" : `${unread} unread`}
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(notifications ?? []).slice(0, 3).length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-4 text-sm text-muted-foreground sm:col-span-3">
              No notifications yet.
            </div>
          ) : (
            (notifications ?? []).slice(0, 3).map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "h-1.5 w-1.5 rounded-full " +
                      (n.type === "payment"
                        ? "bg-[var(--gain)]"
                        : n.type === "rate_alert"
                          ? "bg-[var(--warn)]"
                          : "bg-[var(--silver)]")
                    }
                  />
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  <div className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {timeAgo(new Date(n.created_at).getTime())}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{n.body}</div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      <ReserveStockDialog
        open={reserveOpen}
        onOpenChange={setReserveOpen}
        onReserved={() => {
          refetch();
          void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
        }}
      />
      <RateAlertDialog open={alertOpen} onOpenChange={setAlertOpen} />
      <DealerOrderDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        onCreated={() => void loadRecentOrders()}
      />
    </AppShell>
  );
}

type MetalType = "gold" | "silver" | "platinum" | "palladium";

type RateAlert = {
  id: string;
  metal_type: MetalType;
  above_price: number | null;
  below_price: number | null;
};
function RateAlertDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [metal, setMetal] = useState<MetalType>("gold");
  const [above, setAbove] = useState("");
  const [below, setBelow] = useState("");
  const [alerts, setAlerts] = useState<RateAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from("rate_alerts")
      .select("id, metal_type, above_price, below_price")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) toast.error("Unable to load rate alerts.");
    else setAlerts(data ?? []);
  };
  useEffect(() => {
    if (open) void loadAlerts();
  }, [open]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const abovePrice = above ? Number(above) : null;
    const belowPrice = below ? Number(below) : null;
    if (
      (!abovePrice && !belowPrice) ||
      (abovePrice !== null && abovePrice <= 0) ||
      (belowPrice !== null && belowPrice <= 0)
    ) {
      toast.error("Enter at least one valid price threshold.");
      return;
    }
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      toast.error("Please sign in again to set an alert.");
      return;
    }
    const { error } = await supabase.from("rate_alerts").insert({
      user_id: auth.user.id,
      metal_type: metal,
      above_price: abovePrice,
      below_price: belowPrice,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rate alert saved.");
    setAbove("");
    setBelow("");
    void loadAlerts();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set rate alert</DialogTitle>
          <DialogDescription>
            Get notified when the selected metal reaches your threshold.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1.5 text-sm">
            Metal
            <select
              value={metal}
              onChange={(e) => setMetal(e.target.value as MetalType)}
              className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm"
            >
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="platinum">Platinum</option>
              <option value="palladium">Palladium</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm">
              Above price
              <input
                value={above}
                onChange={(e) => setAbove(e.target.value)}
                type="number"
                min="0"
                step="any"
                className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              Below price
              <input
                value={below}
                onChange={(e) => setBelow(e.target.value)}
                type="number"
                min="0"
                step="any"
                className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm"
              />
            </label>
          </div>
          {alerts.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-[var(--surface-2)]/60 p-3 text-xs">
              <div className="mb-2 font-medium text-sm">Existing alerts</div>
              {alerts.map((alert) => (
                <div key={alert.id} className="py-1 capitalize">
                  {alert.metal_type} · {alert.above_price ? `above ₹${alert.above_price}` : ""}
                  {alert.above_price && alert.below_price ? " · " : ""}
                  {alert.below_price ? `below ₹${alert.below_price}` : ""}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-4 text-sm font-medium text-black disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save alert"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── RateCard ─────────────────────────────────────────────────────────────────

// Fallback static series for when the API is unconfigured
const FALLBACK_GOLD_SERIES = Array.from({ length: 48 }, (_, i) => ({
  t: i,
  v: 71_800 + Math.sin(i / 4) * 180 + i * 6 + (i > 32 ? 90 : 0),
}));
const FALLBACK_SILVER_SERIES = Array.from({ length: 48 }, (_, i) => ({
  t: i,
  v: 89_600 - Math.cos(i / 3) * 220 - i * 4,
}));

function RateCard({
  label,
  hint,
  rate,
  isLoading,
  isError,
  fallbackPrice,
  fallbackSeries,
}: {
  label: string;
  hint: string;
  rate?: MetalRate;
  isLoading: boolean;
  isError: boolean;
  fallbackPrice: string;
  fallbackSeries: { t: number; v: number }[];
}) {
  // Derive display values from live data or fall back gracefully
  const price = rate ? fmtINR(rate.priceINR) : fallbackPrice;
  const delta = rate ? fmtChange(rate.changeAbs) : "—";
  const pct = rate ? fmtPct(rate.changePct) : "—";
  const up = rate ? rate.up : true;
  const series = rate ? generateSparkline(rate.prevINR, rate.priceINR) : fallbackSeries;

  const color = up ? "var(--gain)" : "var(--loss)";

  return (
    <GlassCard className="relative overflow-hidden p-5">
      {/* Loading pulse overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col gap-3 p-5">
          <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--surface-3)]" />
          <div className="h-8 w-36 animate-pulse rounded-lg bg-[var(--surface-3)]" />
          <div className="h-3 w-20 animate-pulse rounded-full bg-[var(--surface-3)]" />
          <div className="mt-auto h-24 animate-pulse rounded-xl bg-[var(--surface-3)]" />
        </div>
      )}

      <div className={isLoading ? "invisible" : undefined}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {label}
              </div>
              {isError && <span className="text-[10px] text-[var(--loss)]">· stale</span>}
            </div>
            <div className="metallic-text mt-2 font-mono text-3xl font-semibold">₹{price}</div>
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          </div>
          {rate ? (
            <div
              className="flex items-center gap-1 rounded-full px-2 py-1 font-mono text-xs"
              style={{
                background: `color-mix(in oklab, ${color} 15%, transparent)`,
                color,
              }}
            >
              {up ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {delta} · {pct}
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 font-mono text-xs text-muted-foreground">
              {delta} · {pct}
            </div>
          )}
        </div>
        <div className="mt-4 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={["dataMin - 60", "dataMax + 60"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(v: number) => [`₹${fmtINR(v)}`, label]}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#g-${label})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {rate && (
          <div className="mt-2 text-right text-[10px] text-muted-foreground">
            Prev close ₹{fmtINR(rate.prevINR)}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
