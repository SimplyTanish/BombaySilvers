-- =============================================================================
-- Fix adjust_inventory vs trg_inventory_quantity_sanity
--
-- adjust_inventory changes quantity_available (a real stock take/restock), but
-- the trg_inventory_quantity_sanity trigger added in migration 003 forbids the
-- total (available + reserved) from changing unless the statement sets
-- app.bypass_inventory_total_lock. Without the bypass, staff restocks/write-offs
-- raised "inventory total ... changed ... outside of a stock-adjustment bypass".
--
-- This migration re-creates adjust_inventory to opt into the bypass for its
-- UPDATE statement only, preserving the trigger's protection for everything
-- else. Idempotent (CREATE OR REPLACE).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.adjust_inventory(
  p_inventory_id UUID,
  p_quantity_delta NUMERIC,
  p_reason TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS public.inventory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory public.inventory;
  v_new_qty   NUMERIC;
  v_role      public.user_role;
BEGIN
  v_role := public.get_my_role();
  IF v_role NOT IN ('super_admin', 'admin', 'staff') THEN
    RAISE EXCEPTION 'Insufficient permission: only staff and above may adjust inventory';
  END IF;

  IF p_quantity_delta = 0 THEN
    RAISE EXCEPTION 'Quantity delta must be non-zero';
  END IF;

  SELECT * INTO v_inventory FROM public.inventory WHERE id = p_inventory_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory % not found', p_inventory_id;
  END IF;

  v_new_qty := v_inventory.quantity_available + p_quantity_delta;
  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Stock cannot go negative (available % + delta % = %)',
      v_inventory.quantity_available, p_quantity_delta, v_new_qty;
  END IF;

  -- Staff already hold direct UPDATE on inventory (staff_update_inventory policy
  -- exists), but going through this function preserves the append-only trail.
  -- The trg_inventory_quantity_sanity trigger forbids changing the total
  -- (available + reserved) unless app.bypass_inventory_total_lock is set, so
  -- this legitimate adjustment opts into the bypass for this statement only.
  PERFORM set_config('app.bypass_inventory_total_lock', 'true', true);

  UPDATE public.inventory
     SET quantity_available = v_new_qty,
         updated_at = NOW()
   WHERE id = p_inventory_id
   RETURNING * INTO v_inventory;

  INSERT INTO public.inventory_transactions (
    inventory_id, transaction_type, quantity_delta, quantity_after,
    rate_per_gram, reason, performed_by
  ) VALUES (
    p_inventory_id,
    CASE WHEN p_quantity_delta > 0 THEN 'purchase'::public.inventory_transaction_type
         ELSE 'adjustment'::public.inventory_transaction_type END,
    p_quantity_delta, v_new_qty,
    v_inventory.rate_per_gram, COALESCE(p_reason, p_note), auth.uid()
  );

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, metadata)
  VALUES (auth.uid(), 'update', 'inventory', p_inventory_id,
          jsonb_build_object('quantity_available', v_new_qty - p_quantity_delta),
          jsonb_build_object('quantity_available', v_new_qty),
          jsonb_build_object('delta', p_quantity_delta, 'reason', p_reason));

  RETURN v_inventory;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_inventory(UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_inventory(UUID, NUMERIC, TEXT, TEXT) TO authenticated;