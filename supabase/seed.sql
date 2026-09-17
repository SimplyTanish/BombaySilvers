-- =============================================================================
-- Bombay Silvers Dealer Terminal — Seed
--
-- Idempotent bootstrap data for a working deployment:
--   1. One warehouse (Mumbai, IN)
--   2. Core bullion product catalog
--   3. Opening inventory + first stock-adjustment audit rows
--   4. Initial published rate sheet (so latest_rates / admin UI are never empty)
--
-- Safe to re-run: every insert is guarded by ON CONFLICT DO NOTHING except
-- inventory_transactions (append-only, no conflict target) which is conditional.
-- =============================================================================

SET search_path = public;

-- ---------------------------------------------------------------------------
-- 1. WAREHOUSE
-- ---------------------------------------------------------------------------
INSERT INTO public.warehouses (id, name, city, state, address, pincode, country_code, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Bombay Silvers HQ Vault', 'Mumbai', 'Maharashtra', '12A Zaveri Bazaar, Nariman Point', '400001', 'IN', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.warehouses (id, name, city, state, address, pincode, country_code, is_active) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Delhi Karol Bagh Hub', 'New Delhi', 'Delhi', '45 Dariba Kalan', '110006', 'IN', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. PRODUCTS
-- ---------------------------------------------------------------------------
INSERT INTO public.products
  (id, sku, name, metal_type, purity, unit_weight_grams, unit, description, hsn_code, gst_rate, is_active)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'GOLD-24K-100G',  'Gold 24K Bar 100g',    'gold',    999.9, 100, 'gram',  'LBMA 999.9 fine gold bar, 100g',  '7108', 0.03, TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'GOLD-24K-50G',   'Gold 24K Bar 50g',     'gold',    999.9,  50, 'gram',  'LBMA 999.9 fine gold bar, 50g',   '7108', 0.03, TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'GOLD-24K-COIN',  'Gold 24K Sovereign',   'gold',    999.9,   8, 'gram',  '999.9 fine gold sovereign coin',  '7108', 0.03, TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'GOLD-22K-COIN',  'Gold 22K Coin',         'gold',    916.0,   8, 'gram',  '916 hallmarked gold coin',        '7108', 0.03, TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'SILVER-999-1KG', 'Silver 999 Bar 1kg',    'silver',  999.0,1000, 'gram',  '999 fine silver bar, 1kg',        '7106', 0.03, TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'SILVER-999-500G','Silver 999 Bar 500g',   'silver',  999.0, 500, 'gram',  '999 fine silver bar, 500g',       '7106', 0.03, TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000007', 'PLAT-950-100G',  'Platinum 950 Bar 100g', 'platinum',950.0, 100, 'gram',  '950 platinum bar, 100g',          '7110', 0.03, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. OPENING INVENTORY (HQ warehouse)
--    rate_per_gram = latest buy-side reference rate used for stock valuation.
-- ---------------------------------------------------------------------------
INSERT INTO public.inventory (id, product_id, warehouse_id, quantity_available, quantity_reserved, rate_per_gram, currency_code)
VALUES
  ('bbbbbbbb-0000-0000-0000-000000000101', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',  1500, 0, 7485.5, 'INR'),
  ('bbbbbbbb-0000-0000-0000-000000000102', 'aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',  3000, 0, 7485.5, 'INR'),
  ('bbbbbbbb-0000-0000-0000-000000000103', 'aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',   400, 0, 7520.0, 'INR'),
  ('bbbbbbbb-0000-0000-0000-000000000104', 'aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',   800, 0, 6890.0, 'INR'),
  ('bbbbbbbb-0000-0000-0000-000000000105', 'aaaaaaaa-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 30000, 0,   86.4, 'INR'),
  ('bbbbbbbb-0000-0000-0000-000000000106', 'aaaaaaaa-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 20000, 0,   86.4, 'INR'),
  ('bbbbbbbb-0000-0000-0000-000000000107', 'aaaaaaaa-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',   500, 0, 3220.0, 'INR')
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. OPENING STOCK ADJUSTMENTS (audit trail behind the opening balance)
-- ---------------------------------------------------------------------------
INSERT INTO public.inventory_transactions
  (inventory_id, transaction_type, quantity_delta, quantity_after, rate_per_gram, reason, performed_by)
SELECT
  i.id                                  AS inventory_id,
  'adjustment'::public.inventory_transaction_type AS transaction_type,
  i.quantity_available                  AS quantity_delta,
  i.quantity_available                  AS quantity_after,
  i.rate_per_gram                       AS rate_per_gram,
  'Opening stock (seed)'                AS reason,
  NULL                                  AS performed_by
FROM public.inventory i
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_transactions t
  WHERE t.inventory_id = i.id AND t.reason = 'Opening stock (seed)'
);

-- ---------------------------------------------------------------------------
-- 5. INITIAL PUBLISHED RATE SHEET (so latest_rates is populated)
-- ---------------------------------------------------------------------------
INSERT INTO public.published_rates
  (id, metal, purity, label, unit, buy_rate, sell_rate, currency_code, published_by)
VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'gold',     999.0, 'Gold 24K',   'gram', 7485.5, 7635.0, 'INR', NULL),
  ('cccccccc-0000-0000-0000-000000000002', 'gold',     916.0, 'Gold 22K',   'gram', 6890.0, 7025.0, 'INR', NULL),
  ('cccccccc-0000-0000-0000-000000000003', 'silver',   999.0, 'Silver 999', 'gram',   86.4,   94.8, 'INR', NULL),
  ('cccccccc-0000-0000-0000-000000000004', 'platinum', 950.0, 'Platinum 950','gram',3220.0, 3390.0, 'INR', NULL)
ON CONFLICT (id) DO NOTHING;