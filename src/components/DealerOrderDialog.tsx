import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type InventoryProduct = {
  id: string;
  rate_per_gram: number;
  warehouse_id: string;
  quantity_available: number;
  products: {
    id: string;
    name: string;
    metal_type: "gold" | "silver" | "platinum" | "palladium";
    purity: number;
    unit: string;
    unit_weight_grams: number;
  } | null;
};

export function DealerOrderDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [metal, setMetal] =
    useState<NonNullable<InventoryProduct["products"]>["metal_type"]>("gold");
  const [inventoryId, setInventoryId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rateType, setRateType] = useState("live");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("inventory")
          .select(
            "id, warehouse_id, quantity_available, rate_per_gram, products(id, name, metal_type, purity, unit, unit_weight_grams)",
          )
          .gt("quantity_available", 0);
        if (error) toast.error("Unable to load products for ordering.");
        else setInventory((data ?? []) as unknown as InventoryProduct[]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open]);

  const products = useMemo(
    () => inventory.filter((item) => item.products?.metal_type === metal),
    [inventory, metal],
  );
  const selected = inventory.find((item) => item.id === inventoryId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const count = Number(quantity);
    if (!selected || !selected.products || !Number.isFinite(count) || count <= 0) {
      toast.error("Select a product and enter a valid quantity.");
      return;
    }
    if (count > selected.quantity_available) {
      toast.error(`Only ${selected.quantity_available} units are available.`);
      return;
    }

    setLoading(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in again to place an order.");

      const { data: dealer, error: dealerError } = await supabase
        .from("dealers")
        .select("id, firm_id")
        .eq("user_id", auth.user.id)
        .single();
      if (dealerError || !dealer) throw new Error("Your dealer profile could not be loaded.");

      const { data: firm } = dealer.firm_id
        ? await supabase
            .from("firms")
            .select("firm_name, city, state, warehouse_address")
            .eq("id", dealer.firm_id)
            .maybeSingle()
        : { data: null };
      const { data: orderNumber, error: numberError } = await supabase.rpc("generate_order_number");
      if (numberError || !orderNumber) throw new Error("Unable to generate an order number.");

      const weight = selected.products.unit_weight_grams;
      const subtotal = selected.rate_per_gram * weight * count;
      const totalGst = subtotal * 0.03;
      const notes = [`Rate type: ${rateType}`, remarks.trim()].filter(Boolean).join("\n");
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          dealer_id: dealer.id,
          status: "draft",
          delivery_name: firm?.firm_name ?? "Delivery details pending",
          delivery_address: firm?.warehouse_address ?? "Delivery details pending confirmation",
          delivery_city: firm?.city ?? "Pending",
          delivery_state: firm?.state ?? "Pending",
          delivery_pincode: "000000",
          subtotal,
          total_gst: totalGst,
          grand_total: subtotal + totalGst,
          notes,
          created_by: auth.user.id,
        })
        .select("id")
        .single();
      if (orderError || !order) throw orderError ?? new Error("Unable to create the order.");

      const { error: itemError } = await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: selected.products.id,
        warehouse_id: selected.warehouse_id,
        quantity: count,
        unit_price: selected.rate_per_gram,
        gst_rate: 0.03,
        gst_amount: totalGst,
        total_amount: subtotal + totalGst,
      });
      if (itemError) throw itemError;

      const { data: invoice, error: invoiceError } = await supabase.rpc("generate_dealer_invoice", {
        p_order_id: order.id,
      });
      if (invoiceError || !invoice?.[0]) {
        throw invoiceError ?? new Error("Order created, but its invoice could not be generated.");
      }

      toast.success(
        `Order ${orderNumber} and invoice ${invoice[0].invoice_number} created successfully.`,
      );
      setInventoryId("");
      setQuantity("");
      setRemarks("");
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create the order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New order</DialogTitle>
          <DialogDescription>
            Place a bullion order from currently available inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1.5 text-sm">
            Metal
            <select
              value={metal}
              onChange={(event) => {
                setMetal(event.target.value as typeof metal);
                setInventoryId("");
              }}
              disabled={loading}
              className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm"
            >
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="platinum">Platinum</option>
              <option value="palladium">Palladium</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            Product
            <select
              value={inventoryId}
              onChange={(event) => setInventoryId(event.target.value)}
              disabled={loading}
              required
              className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm"
            >
              <option value="">{loading ? "Loading products…" : "Select product"}</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.products?.name} · {item.quantity_available} available
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm">
              Purity
              <input
                value={selected?.products?.purity ?? ""}
                readOnly
                required
                className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm text-muted-foreground"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              Weight
              <input
                value={selected ? `${selected.products?.unit_weight_grams ?? ""} g` : ""}
                readOnly
                required
                className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm text-muted-foreground"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm">
              Quantity
              <input
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                type="number"
                min="0.0001"
                step="any"
                required
                disabled={loading}
                className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              Rate type
              <select
                value={rateType}
                onChange={(event) => setRateType(event.target.value)}
                disabled={loading}
                className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm"
              >
                <option value="live">Live rate</option>
                <option value="locked">Locked rate</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1.5 text-sm">
            Remarks
            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              rows={3}
              disabled={loading}
              className="rounded-lg border border-border bg-[var(--surface-2)] p-3 text-sm"
            />
          </label>
          <DialogFooter>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-4 text-sm font-medium text-black disabled:opacity-50"
            >
              {loading ? "Creating order…" : "Place order"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
