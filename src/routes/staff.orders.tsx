import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, GlassCard, PageTitle, LiveDot } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import {
  useStaffOrders,
  useTransitionOrder,
  useReserveForOrder,
  nextStatuses,
  type StaffOrderStatus,
} from "@/hooks/use-staff";
import { fmtINR } from "@/lib/rates";
import { Loader2, MapPin, Phone, ChevronRight, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/staff/orders")({
  head: () => ({ meta: [{ title: "Order Queue · Bombay Silvers" }] }),
  component: StaffOrders,
});

const FILTERS: Array<{ key: StaffOrderStatus | "all"; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "dispatched", label: "Dispatched" },
  { key: "in_transit", label: "In transit" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

const statusTone: Record<string, string> = {
  pending: "bg-[var(--warn)]/10 text-[var(--warn)]",
  confirmed: "bg-[var(--silver)]/15 text-[var(--platinum)]",
  dispatched: "bg-[var(--silver)]/15 text-[var(--platinum)]",
  in_transit: "bg-[var(--silver)]/15 text-[var(--platinum)]",
  delivered: "bg-[var(--gain)]/10 text-[var(--gain)]",
  cancelled: "bg-[var(--loss)]/10 text-[var(--loss)]",
};

const pretty = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

function StaffOrders() {
  const [filter, setFilter] = useState<StaffOrderStatus | "all">("pending");
  const { data: orders, isLoading, isError } = useStaffOrders(filter);
  const transition = useTransitionOrder();
  const reserve = useReserveForOrder();

  return (
    <RequireRole role={["staff", "admin", "super_admin"]}>
      <AppShell>
        <PageTitle
          title="Order queue"
          subtitle="Sales desk · process dealer orders"
          actions={<LiveDot label="Orders realtime" />}
        />

        {/* Status filter chips */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs transition-colors " +
                (filter === key
                  ? "bg-foreground text-background"
                  : "border border-border/70 bg-[var(--surface-2)] text-muted-foreground hover:text-foreground")
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {isLoading && (
            <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--loss)]/20 bg-[var(--loss)]/5 p-4 text-sm text-[var(--loss)]">
              Could not load orders. Check permissions.
            </div>
          )}
          {!isLoading && !isError && (orders ?? []).length === 0 && (
            <div className="rounded-xl border border-border/60 bg-[var(--surface-2)]/40 p-10 text-center text-sm text-muted-foreground">
              No {filter === "all" ? "" : pretty(filter) + " "}orders to show.
            </div>
          )}

          {(orders ?? []).map((order) => {
            const targets = nextStatuses(order.status);
            const firstItem = order.items[0];
            return (
              <GlassCard key={order.id} className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-sm text-muted-foreground">
                      {order.order_number}
                    </div>
                    <div className="mt-0.5 text-lg font-semibold">
                      {order.dealer?.dealer_code ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.delivery_name} · {order.delivery_city}
                    </div>
                  </div>
                  <span
                    className={
                      "rounded-full px-2.5 py-1 text-[11px] " +
                      (statusTone[order.status] ?? "bg-[var(--surface-3)]")
                    }
                  >
                    {pretty(order.status)}
                  </span>
                </div>

                {/* Items summary */}
                <div className="mt-4 space-y-1.5 rounded-lg border border-border/50 bg-[var(--surface-2)]/40 p-3 text-xs">
                  {firstItem && (
                    <div className="flex items-center justify-between">
                      <span>{firstItem.product?.name ?? "Product"}</span>
                      <span className="font-mono text-muted-foreground">
                        {firstItem.quantity} {firstItem.product?.unit ?? "g"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Grand total</span>
                    <span className="font-mono text-foreground">₹{fmtINR(order.grand_total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Created</span>
                    <span className="font-mono">
                      {new Intl.DateTimeFormat("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(order.created_at))}
                    </span>
                  </div>
                </div>

                {/* Action row */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {targets.map((s) => (
                    <button
                      key={s}
                      disabled={transition.isPending || reserve.isPending}
                      onClick={() =>
                        s === "confirmed"
                          ? reserve.mutate(order.id)
                          : transition.mutate({ orderId: order.id, status: s })
                      }
                      className={
                        "inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium transition-opacity disabled:opacity-40 " +
                        (s === "cancelled"
                          ? "border border-[var(--loss)]/30 text-[var(--loss)] hover:bg-[var(--loss)]/10"
                          : "bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] text-black")
                      }
                    >
                      {s === "confirmed" && <ArrowRight className="h-3.5 w-3.5" />}
                      {s === "cancelled" ? "Cancel" : pretty(s)}
                    </button>
                  ))}
                  {order.status === "pending" && order.delivery_phone && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Phone className="h-3 w-3" /> {order.delivery_phone}
                    </span>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </AppShell>
    </RequireRole>
  );
}
