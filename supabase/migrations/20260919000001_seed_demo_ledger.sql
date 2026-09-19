-- =============================================================================
-- Seed demo ledger data (6 months) for a specified dealer.
--
-- Generates a realistic 6-month trading history for a demo dealer:
--   orders → order_items → invoices → ledger_entries (debits) + monthly
--   payment entries (credits), plus 'sale' inventory_transactions for
--   delivered orders. Leaves a realistic outstanding balance on the dealer.
--
-- Usage (Service role / Management API / SQL):
--   SELECT public.seed_demo_ledger('<dealer-uuid>');
--
-- Safe properties:
--   * Idempotent — returns FALSE (no-op) if the dealer already has ledger
--     entries, so re-running never double-seeds.
--   * Append-only tables are only INSERTed into, never updated/deleted.
--   * Order/invoice numbers come from the existing shared sequences, so the
--     seed cannot collide with real business documents.
--   * Inventory totals are adjusted under the sanctioned
--     app.bypass_inventory_total_lock bypass, inside a single function
--     transaction, with a matching inventory_transactions audit row on every
--     delivered order.
--   * Dealer privileged fields (current_balance, credit_limit) are written
--     from inside a SECURITY DEFINER function (runs as its owner), which is
--     the only sanctioned path.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.seed_demo_ledger(p_dealer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_firm_id    UUID;
  v_firm_name  TEXT;
  v_firm_city  TEXT;
  v_firm_state TEXT;
  v_firm_addr  TEXT;

  v_have       INTEGER;

  -- product catalog lookups
  v_p100   public.products%ROWTYPE;  -- gold 100g
  v_p50    public.products%ROWTYPE;  -- gold 50g
  v_gsov   public.products%ROWTYPE;  -- gold sovereign
  v_coin   public.products%ROWTYPE;  -- gold 22k coin
  v_s1kg   public.products%ROWTYPE;  -- silver 1kg
  v_s500   public.products%ROWTYPE;  -- silver 500g
  v_pt     public.products%ROWTYPE;  -- platinum 100g

  v_wh_id  UUID;
  v_inv_id UUID;

  -- per-order computation
  v_order_id  UUID;
  v_inv_row   UUID;
  v_order_no  TEXT;
  v_inv_no    TEXT;
  v_status    public.order_status;
  v_dt        TIMESTAMPTZ;
  v_prod      public.products%ROWTYPE;
  v_qty       NUMERIC;
  v_rate      NUMERIC;
  v_weight    NUMERIC;
  v_sub       NUMERIC;
  v_gst       NUMERIC;
  v_total     NUMERIC;
  v_avail     NUMERIC;
  v_bal       NUMERIC := 0;
  v_pay       NUMERIC;
  v_t         NUMERIC;

  i INTEGER;
  k INTEGER;
  m INTEGER;
  p NUMERIC;
BEGIN
  SELECT count(*) INTO v_have
  FROM public.ledger_entries
  WHERE dealer_id = p_dealer_id;

  IF v_have > 0 THEN
    RAISE NOTICE 'Dealer % already has % ledger entries; skipping seed.', p_dealer_id, v_have;
    RETURN FALSE;
  END IF;

  SELECT user_id, firm_id INTO v_user_id, v_firm_id
  FROM public.dealers WHERE id = p_dealer_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Dealer % not found', p_dealer_id;
  END IF;

  SELECT firm_name, city, state, warehouse_address
    INTO v_firm_name, v_firm_city, v_firm_state, v_firm_addr
  FROM public.firms WHERE id = v_firm_id;

  SELECT * INTO v_p100 FROM public.products WHERE sku = 'GOLD-24K-100G';
  SELECT * INTO v_p50  FROM public.products WHERE sku = 'GOLD-24K-50G';
  SELECT * INTO v_gsov FROM public.products WHERE sku = 'GOLD-24K-COIN';
  SELECT * INTO v_coin FROM public.products WHERE sku = 'GOLD-22K-COIN';
  SELECT * INTO v_s1kg FROM public.products WHERE sku = 'SILVER-999-1KG';
  SELECT * INTO v_s500 FROM public.products WHERE sku = 'SILVER-999-500G';
  SELECT * INTO v_pt   FROM public.products WHERE sku = 'PLAT-950-100G';

  SELECT id INTO v_wh_id FROM public.warehouses WHERE is_active = TRUE ORDER BY created_at LIMIT 1;

  -- Sanctioned inventory adjustment path for the whole function transaction.
  SET LOCAL app.bypass_inventory_total_lock = 'true';

  -- Deterministic "random" generator: 0..1 from an integer seed.
  --   n01(x) = ((x * 2654435761) % 99991) / 99991.0

  i := 0;

  -- ---------------------------------------------------------------------------
  -- Six full months: Mar 2026 .. Aug 2026, ~4 orders per month (days 2-12),
  -- then a monthly settlement payment on the 15th (Apr 15 onwards).
  -- ---------------------------------------------------------------------------
  FOR m IN 0..5 LOOP
    FOR k IN 1..4 LOOP
      i := i + 1;
      v_dt := (date '2026-03-01' + m * interval '1 month' + (1 + 2 * k) * interval '1 day')
              + time '10:30';

      -- product pick (weighted to silver, like a typical bullion dealer)
      p := (((i * 2654435761) % 99991)::numeric / 99991.0);
      v_t := (i::numeric / 27.0);

      IF p < 0.34 THEN
        v_prod := v_s1kg;
        v_qty := 8 + floor(((((i + 1) * 2654435761) % 99991)::numeric / 99991.0) * 14);        -- 8..21 kg
        v_rate := round(88 + v_t * 9 + ((((i + 2) * 2654435761) % 99991)::numeric / 99991.0) * 2.5, 2);
      ELSIF p < 0.52 THEN
        v_prod := v_s500;
        v_qty := 10 + floor(((((i + 1) * 2654435761) % 99991)::numeric / 99991.0) * 30);       -- 10..39
        v_rate := round(88 + v_t * 9 + ((((i + 2) * 2654435761) % 99991)::numeric / 99991.0) * 2.5, 2);
      ELSIF p < 0.72 THEN
        v_prod := v_p100;
        v_qty := 2 + floor(((((i + 1) * 2654435761) % 99991)::numeric / 99991.0) * 8);         -- 2..9 bars
        v_rate := round(7080 + v_t * 520 + ((((i + 2) * 2654435761) % 99991)::numeric / 99991.0) * 60, 2);
      ELSIF p < 0.82 THEN
        v_prod := v_p50;
        v_qty := 2 + floor(((((i + 1) * 2654435761) % 99991)::numeric / 99991.0) * 6);         -- 2..7 bars
        v_rate := round(7080 + v_t * 520 + ((((i + 2) * 2654435761) % 99991)::numeric / 99991.0) * 60, 2);
      ELSIF p < 0.92 THEN
        v_prod := v_gsov;
        v_qty := 15 + floor(((((i + 1) * 2654435761) % 99991)::numeric / 99991.0) * 50);       -- 15..64 coins
        v_rate := round(7080 + v_t * 520 + ((((i + 2) * 2654435761) % 99991)::numeric / 99991.0) * 60, 2);
      ELSE
        v_prod := v_pt;
        v_qty := 1 + floor(((((i + 1) * 2654435761) % 99991)::numeric / 99991.0) * 4);         -- 1..4 bars
        v_rate := round(3320 + v_t * 120 + ((((i + 2) * 2654435761) % 99991)::numeric / 99991.0) * 40, 2);
      END IF;

      v_weight := v_prod.unit_weight_grams;
      v_sub   := round(v_rate * v_weight * v_qty, 2);
      v_gst   := round(v_sub * 0.03, 2);
      v_total := v_sub + v_gst;

      -- status ladder: the last delivered order stays in-flight
      v_status := 'delivered';
      IF i IN (7, 14, 21) THEN v_status := 'confirmed'; END IF;
      IF i = 24 THEN v_status := 'dispatched'; END IF;

      v_order_no := public.generate_order_number();
      INSERT INTO public.orders (
        order_number, dealer_id, status, delivery_name, delivery_address,
        delivery_city, delivery_state, delivery_pincode, delivery_phone,
        subtotal, total_gst, grand_total, notes, dispatched_at, delivered_at,
        created_by, created_at
      ) VALUES (
        v_order_no, p_dealer_id, v_status,
        COALESCE(v_firm_name, 'Test Bullion Traders'),
        COALESCE(v_firm_addr, 'Mira Road, Mumbai'),
        COALESCE(v_firm_city, 'Mumbai'), COALESCE(v_firm_state, 'Maharashtra'),
        '400001', '+919876543210',
        v_sub, v_gst, v_total,
        'Rate type: live' || E'\n' || 'Demo sales history (auto-seeded)',
        CASE WHEN v_status IN ('dispatched', 'delivered') THEN v_dt + interval '2 days' ELSE NULL END,
        CASE WHEN v_status = 'delivered' THEN v_dt + interval '4 days' ELSE NULL END,
        v_user_id, v_dt
      ) RETURNING id INTO v_order_id;

      INSERT INTO public.order_items (
        order_id, product_id, warehouse_id, quantity, unit_price, gst_rate,
        gst_amount, total_amount, created_at
      ) VALUES (
        v_order_id, v_prod.id, v_wh_id, v_qty, v_rate, 0.03, v_gst, v_total, v_dt
      );

      -- inventory: reduce stock + append audit trail for delivered orders
      IF v_status = 'delivered' THEN
        SELECT id INTO v_inv_id FROM public.inventory
        WHERE product_id = v_prod.id AND warehouse_id = v_wh_id;
        IF v_inv_id IS NOT NULL THEN
          UPDATE public.inventory
            SET quantity_available = quantity_available - v_qty
          WHERE id = v_inv_id
          RETURNING quantity_available INTO v_avail;

          INSERT INTO public.inventory_transactions (
            inventory_id, transaction_type, quantity_delta, quantity_after,
            rate_per_gram, reason, reference_type, reference_id, performed_by, created_at
          ) VALUES (
            v_inv_id, 'sale'::public.inventory_transaction_type, -v_qty, v_avail,
            v_rate, 'Delivery — ' || v_order_no, 'order', v_order_id, v_user_id, v_dt
          );
        END IF;
      END IF;

      -- GST-compliant invoice for every order
      SELECT public.generate_invoice_number() INTO v_inv_no;
      INSERT INTO public.invoices (
        invoice_number, order_id, dealer_id, invoice_date, due_date,
        subtotal, cgst, sgst, igst, total_gst, grand_total, status, notes, created_at
      ) VALUES (
        v_inv_no, v_order_id, p_dealer_id, v_dt::date, v_dt::date + 30,
        v_sub, v_gst / 2, v_gst / 2, 0, v_gst, v_total,
        CASE WHEN v_dt < date '2026-08-01' THEN 'paid'::public.invoice_status ELSE 'issued'::public.invoice_status END,
        'Demo sales history (auto-seeded)', v_dt
      ) RETURNING id INTO v_inv_row;

      -- ledger debit: amount billed
      INSERT INTO public.ledger_entries (
        dealer_id, entry_type, amount, balance_after, description,
        reference_type, reference_id, created_by, created_at
      ) VALUES (
        p_dealer_id, 'debit'::public.ledger_entry_type, v_total, v_bal - v_total,
        'Invoice ' || v_inv_no || ' · ' || v_prod.name || ' × ' || trim(trailing '0' from trim(trailing '.' from v_qty::text)),
        'invoice'::public.ledger_reference_type, v_inv_row, v_user_id, v_dt
      );
      v_bal := v_bal - v_total;
    END LOOP;

    -- Monthly settlement on the 15th (from Apr 15), covering ~85% of the
    -- outstanding position accumulated so far.
    IF m > 0 THEN
      v_pay := round(abs(v_bal) * 0.85, 2);
      IF v_pay > 0 THEN
        v_dt := (date '2026-03-01' + m * interval '1 month' + 14 * interval '1 day') + time '11:45';
        INSERT INTO public.ledger_entries (
          dealer_id, entry_type, amount, balance_after, description,
          reference_type, created_by, created_at
        ) VALUES (
          p_dealer_id, 'credit'::public.ledger_entry_type, v_pay, v_bal + v_pay,
          'Payment received — monthly settlement · ' || to_char(v_dt, 'Mon YYYY'),
          'payment'::public.ledger_reference_type, v_user_id, v_dt
        );
        v_bal := v_bal + v_pay;
      END IF;
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------------
  -- September (current month): 3 recent orders, still unpaid → outstanding.
  -- ---------------------------------------------------------------------------
  FOR k IN 1..3 LOOP
    i := i + 1;
    v_dt := date '2026-09-01' + ((k * 4)::int - 1) * interval '1 day' + time '12:15';
    p := (((i * 2654435761) % 99991)::numeric / 99991.0);
    v_t := (i::numeric / 27.0);

    IF p < 0.5 THEN
      v_prod := v_s1kg;
      v_qty := 8 + floor(((((i + 1) * 2654435761) % 99991)::numeric / 99991.0) * 14);
      v_rate := round(96 + ((((i + 2) * 2654435761) % 99991)::numeric / 99991.0) * 2, 2);
      v_status := 'pending';
    ELSIF p < 0.8 THEN
      v_prod := v_p100;
      v_qty := 2 + floor(((((i + 1) * 2654435761) % 99991)::numeric / 99991.0) * 8);
      v_rate := round(7580 + ((((i + 2) * 2654435761) % 99991)::numeric / 99991.0) * 40, 2);
      v_status := 'confirmed';
    ELSE
      v_prod := v_gsov;
      v_qty := 15 + floor(((((i + 1) * 2654435761) % 99991)::numeric / 99991.0) * 50);
      v_rate := round(7580 + ((((i + 2) * 2654435761) % 99991)::numeric / 99991.0) * 40, 2);
      v_status := 'dispatched';
    END IF;

    v_weight := v_prod.unit_weight_grams;
    v_sub   := round(v_rate * v_weight * v_qty, 2);
    v_gst   := round(v_sub * 0.03, 2);
    v_total := v_sub + v_gst;

    v_order_no := public.generate_order_number();
    INSERT INTO public.orders (
      order_number, dealer_id, status, delivery_name, delivery_address,
      delivery_city, delivery_state, delivery_pincode, delivery_phone,
      subtotal, total_gst, grand_total, notes,
      dispatched_at, delivered_at, created_by, created_at
    ) VALUES (
      v_order_no, p_dealer_id, v_status,
      COALESCE(v_firm_name, 'Test Bullion Traders'),
      COALESCE(v_firm_addr, 'Mira Road, Mumbai'),
      COALESCE(v_firm_city, 'Mumbai'), COALESCE(v_firm_state, 'Maharashtra'),
      '400001', '+919876543210',
      v_sub, v_gst, v_total,
      'Rate type: live' || E'\n' || 'Demo sales history (auto-seeded)',
      CASE WHEN v_status = 'dispatched' THEN v_dt + interval '2 days' ELSE NULL END,
      NULL,
      v_user_id, v_dt
    ) RETURNING id INTO v_order_id;

    INSERT INTO public.order_items (
      order_id, product_id, warehouse_id, quantity, unit_price, gst_rate,
      gst_amount, total_amount, created_at
    ) VALUES (
      v_order_id, v_prod.id, v_wh_id, v_qty, v_rate, 0.03, v_gst, v_total, v_dt
    );

    SELECT public.generate_invoice_number() INTO v_inv_no;
    INSERT INTO public.invoices (
      invoice_number, order_id, dealer_id, invoice_date, due_date,
      subtotal, cgst, sgst, igst, total_gst, grand_total, status, notes, created_at
    ) VALUES (
      v_inv_no, v_order_id, p_dealer_id, v_dt::date, v_dt::date + 30,
      v_sub, v_gst / 2, v_gst / 2, 0, v_gst, v_total,
      'issued'::public.invoice_status, 'Demo sales history (auto-seeded)', v_dt
    ) RETURNING id INTO v_inv_row;

    INSERT INTO public.ledger_entries (
      dealer_id, entry_type, amount, balance_after, description,
      reference_type, reference_id, created_by, created_at
    ) VALUES (
      p_dealer_id, 'debit'::public.ledger_entry_type, v_total, v_bal - v_total,
      'Invoice ' || v_inv_no || ' · ' || v_prod.name || ' × ' || trim(trailing '0' from trim(trailing '.' from v_qty::text)),
      'invoice'::public.ledger_reference_type, v_inv_row, v_user_id, v_dt
    );
    v_bal := v_bal - v_total;
  END LOOP;

  -- ---------------------------------------------------------------------------
  -- Finalize dealer: credit limit (only if unset) + running balance snapshot.
  -- ---------------------------------------------------------------------------
  UPDATE public.dealers
    SET current_balance = v_bal,
        credit_limit    = CASE WHEN credit_limit > 0 THEN credit_limit ELSE 40000000 END
  WHERE id = p_dealer_id;

  RAISE NOTICE 'Seeded demo ledger for dealer %: % orders, final balance %', p_dealer_id, i, v_bal;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_demo_ledger(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_demo_ledger(UUID) TO service_role;