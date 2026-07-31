-- Dealer dashboard quick actions: rate alerts and safe stock reservations.

CREATE TABLE public.rate_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  metal_type public.metal_type NOT NULL,
  above_price NUMERIC(18,4),
  below_price NUMERIC(18,4),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rate_alert_has_threshold CHECK (above_price IS NOT NULL OR below_price IS NOT NULL),
  CONSTRAINT rate_alert_positive_thresholds CHECK (
    (above_price IS NULL OR above_price > 0) AND (below_price IS NULL OR below_price > 0)
  )
);

CREATE TRIGGER trg_rate_alerts_updated_at
  BEFORE UPDATE ON public.rate_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.rate_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_alerts FORCE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_rate_alerts"
  ON public.rate_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_own_rate_alerts"
  ON public.rate_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_own_rate_alerts"
  ON public.rate_alerts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_own_rate_alerts"
  ON public.rate_alerts FOR DELETE USING (auth.uid() = user_id);

-- Performs the availability check and both inventory movements in one transaction.
CREATE OR REPLACE FUNCTION public.reserve_inventory(
  p_inventory_id UUID,
  p_quantity NUMERIC,
  p_remarks TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory public.inventory;
BEGIN
  IF auth.uid() IS NULL OR get_my_role() <> 'dealer' OR NOT EXISTS (
    SELECT 1 FROM public.dealers
    WHERE id = get_my_dealer_id() AND status = 'active' AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Only active dealers can reserve stock';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Reservation quantity must be greater than zero';
  END IF;

  SELECT * INTO v_inventory FROM public.inventory WHERE id = p_inventory_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item was not found';
  END IF;
  IF v_inventory.quantity_available < p_quantity THEN
    RAISE EXCEPTION 'Only % units are currently available', v_inventory.quantity_available;
  END IF;

  UPDATE public.inventory
  SET quantity_available = quantity_available - p_quantity,
      quantity_reserved = quantity_reserved + p_quantity
  WHERE id = p_inventory_id;

  INSERT INTO public.inventory_transactions (
    inventory_id, transaction_type, quantity_delta, quantity_after, rate_per_gram,
    reason, reference_type, performed_by
  ) VALUES (
    p_inventory_id, 'reservation', -p_quantity, v_inventory.quantity_available - p_quantity,
    v_inventory.rate_per_gram, NULLIF(trim(p_remarks), ''), 'dealer_reservation', auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_inventory(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_inventory(UUID, NUMERIC, TEXT) TO authenticated;
