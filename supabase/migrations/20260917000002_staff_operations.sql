-- =============================================================================
-- Staff operations — order workflow + inventory adjustments
--
-- The staff role can read everything but currently has NO write access. This
-- migration grants controlled write capability:
--   1. Staff/admin can advance an order through the status state machine by
--      calling transition_order_status(). The pre-existing
--      trg_order_status_machine trigger still enforces the transition DAG.
--   2. Staff/admin adjust inventory via adjust_inventory(), which maintains a
--      non-negative stock invariant and appends an inventory_transaction row.
--
-- Direct UPDATE/DELETE on orders by staff is NOT granted; the status machine
-- and stock invariants can only be exercised through these safe functions.
-- audit_logs + inventory_transactions remain append-only via block_mutation().
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ORDER STATUS TRANSITION (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id UUID,
  p_new_status public.order_status,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order      public.orders;
  v_role       public.user_role;
BEGIN
  v_role := public.get_my_role();
  IF v_role NOT IN ('super_admin', 'admin', 'staff') THEN
    RAISE EXCEPTION 'Insufficient permission: only staff and above may transition orders';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Order % is deleted and cannot transition', p_order_id;
  END IF;

  -- The trg_order_status_machine trigger validates the exact transition DAG;
  -- set deleted_at for cancellations so dealers stop seeing the order.
  UPDATE public.orders
     SET status          = p_new_status,
         notes           = COALESCE(p_notes, notes),
         cancelled_reason = p_notes,
         dispatched_at   = CASE WHEN p_new_status = 'dispatched' THEN NOW() ELSE dispatched_at END,
         delivered_at    = CASE WHEN p_new_status = 'delivered'  THEN NOW() ELSE delivered_at END,
         deleted_at      = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE deleted_at END
   WHERE id = p_order_id
     AND deleted_at IS NULL
   RETURNING * INTO v_order;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order % not found or already deleted', p_order_id;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, metadata)
  VALUES (auth.uid(), 'update', 'order', p_order_id,
          jsonb_build_object('status', v_order.status),
          jsonb_build_object('status', p_new_status),
          jsonb_build_object('order_number', v_order.order_number, 'notes', p_notes));

  -- Notify the dealer.
  INSERT INTO public.notifications (user_id, title, body, type, metadata)
  SELECT u.id,
         'Order ' || v_order.order_number || ' updated',
         'Your order is now ' || replace(p_new_status::TEXT, '_', ' ') || '.',
         'order_update',
         jsonb_build_object('order_id', p_order_id, 'status', p_new_status::TEXT)
    FROM public.users u
    JOIN public.dealers d ON d.user_id = u.id
   WHERE d.id = v_order.dealer_id;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_order_status(UUID, public.order_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, public.order_status, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. INVENTORY ADJUSTMENT (SAFE, LOGGED, NON-NEGATIVE)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Inventory reservation for staff (confirming a pending order).
-- Only usable by staff+; validates order exists and is pending.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_inventory_for_order(
  p_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order    public.orders;
  v_role     public.user_role;
  v_item     RECORD;
  v_inv      public.inventory;
  v_new_avail NUMERIC;
  v_new_res  NUMERIC;
BEGIN
  v_role := public.get_my_role();
  IF v_role NOT IN ('super_admin', 'admin', 'staff') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  SELECT * INTO v_order FROM public.orders
   WHERE id = p_order_id AND deleted_at IS NULL AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending order found for %', p_order_id;
  END IF;

  FOR v_item IN
    SELECT oi.product_id, oi.warehouse_id, oi.quantity,
           p.id AS inv_id, p.quantity_available, p.quantity_reserved
      FROM public.order_items oi
      LEFT JOIN LATERAL (
        SELECT i.id, i.quantity_available, i.quantity_reserved
          FROM public.inventory i
         WHERE i.product_id = oi.product_id AND i.warehouse_id = oi.warehouse_id
         LIMIT 1
      ) p ON TRUE
     WHERE oi.order_id = p_order_id
  LOOP
    IF v_item.inv_id IS NULL THEN
      RAISE EXCEPTION 'No inventory exists for product %. Create inventory first.', v_item.product_id;
    END IF;
    IF v_item.quantity_available < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product % (available %, need %)',
        v_item.product_id, v_item.quantity_available, v_item.quantity;
    END IF;

    v_new_avail := v_item.quantity_available - v_item.quantity;
    v_new_res   := v_item.quantity_reserved  + v_item.quantity;

    SELECT * INTO v_inv FROM public.inventory WHERE id = v_item.inv_id;

    UPDATE public.inventory
       SET quantity_available = v_new_avail,
           quantity_reserved  = v_new_res,
           updated_at = NOW()
     WHERE id = v_item.inv_id;

    INSERT INTO public.inventory_transactions (
      inventory_id, transaction_type, quantity_delta, quantity_after,
      rate_per_gram, reason, reference_type, reference_id, performed_by
    ) VALUES (
      v_item.inv_id,
      'reservation'::public.inventory_transaction_type,
      -v_item.quantity, v_new_avail,
      v_inv.rate_per_gram, 'Reserved for order ' || v_order.order_number,
      'order', p_order_id, auth.uid()
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_inventory_for_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_inventory_for_order(UUID) TO authenticated;