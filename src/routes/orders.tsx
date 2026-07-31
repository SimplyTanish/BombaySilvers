import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { CheckCircle2, Circle, Truck, PackageCheck, Clock, Plus } from "lucide-react";
import { KycGate } from "@/components/KycGate";
import { supabase } from "@/lib/supabase";
import { DealerOrderDialog } from "@/components/DealerOrderDialog";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Orders · Bombay Silvers" }] }),
  component: Orders,
});

type DisplayOrder = { id: string; item: string; status: string; amount: string; date: string };
const tone: Record<string, string> = {
  Draft: "bg-[var(--surface-3)] text-muted-foreground",
  Pending: "bg-[var(--surface-3)] text-muted-foreground",
  Confirmed: "bg-[var(--warn)]/10 text-[var(--warn)]",
  Dispatched: "bg-[var(--silver)]/15 text-[var(--platinum)]",
  Delivered: "bg-[var(--gain)]/10 text-[var(--gain)]",
};

function Orders() {
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [orderOpen, setOrderOpen] = useState(false);
  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, grand_total, created_at, order_items(quantity, products(name))",
      )
      .order("created_at", { ascending: false });
    if (error) return;
    setOrders(
      (
        (data ?? []) as unknown as Array<{
          order_number: string;
          status: string;
          grand_total: number;
          created_at: string;
          order_items: Array<{ quantity: number; products: { name: string } | null }>;
        }>
      ).map((order) => ({
        id: order.order_number,
        item: order.order_items[0]
          ? `${order.order_items[0].products?.name ?? "Product"} · ${order.order_items[0].quantity}`
          : "Order details pending",
        status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
        amount: new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
          order.grand_total,
        ),
        date: new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(order.created_at)),
      })),
    );
  }, []);
  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <AppShell>
      <PageTitle
        title="Orders"
        subtitle={`${orders.length} orders`}
        actions={
          <button
            onClick={() => setOrderOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-4 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
          >
            <Plus className="h-4 w-4" /> New order
          </button>
        }
      />
      <KycGate feature="place orders">
        <GlassCard className="mb-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Tracking
              </div>
              <div className="mt-1 font-mono text-sm text-muted-foreground">Latest order</div>
              <h2 className="mt-1 text-lg font-semibold">
                Track your bullion orders from draft to delivery
              </h2>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-4 items-start gap-2">
            {[
              { l: "Draft", i: Circle },
              { l: "Confirmed", i: CheckCircle2 },
              { l: "Processing", i: PackageCheck },
              { l: "Dispatched", i: Truck },
            ].map((s, i, arr) => (
              <div key={s.l} className="relative flex flex-col items-center">
                {i < arr.length - 1 && (
                  <div className="absolute left-1/2 top-4 h-px w-full bg-border/60" />
                )}
                <div className="z-10 grid h-8 w-8 place-items-center rounded-full border border-border bg-[var(--surface-2)] text-muted-foreground">
                  <s.i className="h-4 w-4" />
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <div className="text-sm font-medium">All orders</div>
            <button
              onClick={() => void loadOrders()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Refresh →
            </button>
          </div>
          <div className="divide-y divide-border/40">
            {orders.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No orders yet.</div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 hover:bg-[var(--surface-2)]/60"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-muted-foreground">{order.id}</div>
                    <div className="truncate text-sm">{order.item}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {order.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        (tone[order.status] ?? tone.Pending) +
                        " rounded-full px-2.5 py-1 text-[11px]"
                      }
                    >
                      {order.status}
                    </span>
                    <span className="font-mono text-sm">₹{order.amount}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </KycGate>
      <DealerOrderDialog open={orderOpen} onOpenChange={setOrderOpen} onCreated={loadOrders} />
    </AppShell>
  );
}
