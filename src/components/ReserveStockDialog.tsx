import { useEffect, useState } from "react";
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

type InventoryOption = {
  id: string;
  quantity_available: number;
  products: { name: string; sku: string } | null;
  warehouses: { name: string } | null;
};

export function ReserveStockDialog({
  open,
  onOpenChange,
  onReserved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReserved?: () => void;
}) {
  const [inventory, setInventory] = useState<InventoryOption[]>([]);
  const [inventoryId, setInventoryId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const selected = inventory.find((item) => item.id === inventoryId);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("inventory")
          .select("id, quantity_available, products(name, sku), warehouses(name)")
          .gt("quantity_available", 0)
          .order("updated_at", { ascending: false });
        if (error) toast.error("Unable to load available inventory.");
        else setInventory((data ?? []) as unknown as InventoryOption[]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const requested = Number(quantity);
    if (!inventoryId || !Number.isFinite(requested) || requested <= 0) {
      toast.error("Select a product and enter a valid quantity.");
      return;
    }
    if (selected && requested > selected.quantity_available) {
      toast.error(`Only ${selected.quantity_available} units are available.`);
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("reserve_inventory", {
      p_inventory_id: inventoryId,
      p_quantity: requested,
      p_remarks: remarks || null,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Stock reserved successfully.");
    setInventoryId("");
    setQuantity("");
    setRemarks("");
    onOpenChange(false);
    onReserved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reserve stock</DialogTitle>
          <DialogDescription>
            Reserve currently available inventory for your next order.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1.5 text-sm">
            Product
            <select
              value={inventoryId}
              onChange={(e) => setInventoryId(e.target.value)}
              disabled={loading}
              className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm"
            >
              <option value="">{loading ? "Loading inventory…" : "Select product"}</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.products?.name ?? "Product"} · {item.warehouses?.name ?? "Warehouse"} (
                  {item.quantity_available} available)
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            Quantity
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              min="0.0001"
              step="any"
              disabled={loading}
              className="h-10 rounded-lg border border-border bg-[var(--surface-2)] px-3 text-sm"
            />
            {selected && (
              <span className="text-xs text-muted-foreground">
                {selected.quantity_available} units available
              </span>
            )}
          </label>
          <label className="grid gap-1.5 text-sm">
            Remarks
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={loading}
              rows={3}
              className="rounded-lg border border-border bg-[var(--surface-2)] p-3 text-sm"
            />
          </label>
          <DialogFooter>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-4 text-sm font-medium text-black disabled:opacity-50"
            >
              {loading ? "Reserving…" : "Reserve stock"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
