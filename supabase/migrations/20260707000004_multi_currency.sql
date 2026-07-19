-- =============================================================================
-- Bombay Silvers Dealer Terminal — Multi-Country / Multi-Currency Support
-- Migration: 20260707000004_multi_currency.sql
--
-- Additive migration (no changes to 001-003). Adds:
--   1. currencies / countries reference tables (ISO 4217 / ISO 3166-1 alpha-2)
--   2. exchange_rates history table (append-only)
--   3. country_code / currency_code columns on firms, warehouses, dealers,
--      inventory, orders, invoices, ledger_entries — each defaulted to the
--      existing India/INR data so this migration is backward compatible
--      with everything created by 001-003.
--   4. RLS + append-only enforcement for the new tables.
--
-- Scope note: this does NOT rework the India-specific GST fields
-- (products.gst_rate, order_items.gst_rate/gst_amount,
-- invoices.cgst/sgst/igst) into a fully generic tax engine. Those columns
-- are reused as a generic percentage/amount for VAT (UAE) and left at 0 for
-- no-tax jurisdictions (Monaco); invoices additionally gain a tax_label +
-- tax_breakdown JSONB so non-GST jurisdictions can record their own
-- structure without new columns per country.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1a. CURRENCIES (ISO 4217)
-- ---------------------------------------------------------------------------
CREATE TABLE public.currencies (
  code           TEXT        PRIMARY KEY,        -- e.g. 'INR', 'USD', 'EUR', 'AED'
  name           TEXT        NOT NULL,
  symbol         TEXT        NOT NULL,
  decimal_places SMALLINT    NOT NULL DEFAULT 2,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.currencies (code, name, symbol, decimal_places) VALUES
  ('INR', 'Indian Rupee', '₹', 2),
  ('USD', 'US Dollar',    '$', 2),
  ('EUR', 'Euro',         '€', 2),
  ('AED', 'UAE Dirham',   'د.إ', 2);


-- ---------------------------------------------------------------------------
-- 1b. COUNTRIES (ISO 3166-1 alpha-2)
-- ---------------------------------------------------------------------------
CREATE TABLE public.countries (
  code                   TEXT        PRIMARY KEY,   -- e.g. 'IN', 'AE', 'MC'
  name                   TEXT        NOT NULL,
  default_currency_code  TEXT        NOT NULL REFERENCES public.currencies(code),
  tax_label              TEXT        NOT NULL DEFAULT 'Tax', -- 'GST', 'VAT', 'None'
  is_active              BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.countries (code, name, default_currency_code, tax_label) VALUES
  ('IN', 'India',                  'INR', 'GST'),
  ('AE', 'United Arab Emirates',   'AED', 'VAT'),
  ('MC', 'Monaco',                 'EUR', 'None');


-- ---------------------------------------------------------------------------
-- 2. EXCHANGE RATES (append-only history; latest row per pair = current rate)
-- ---------------------------------------------------------------------------
CREATE TABLE public.exchange_rates (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency_code  TEXT          NOT NULL REFERENCES public.currencies(code),
  quote_currency_code TEXT          NOT NULL REFERENCES public.currencies(code),
  rate                NUMERIC(18,8) NOT NULL CHECK (rate > 0), -- 1 base = `rate` quote
  as_of               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  source              TEXT,                                    -- e.g. 'manual', 'exchangerate-api'
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CHECK (base_currency_code <> quote_currency_code)
);

CREATE INDEX idx_exchange_rates_pair_asof
  ON public.exchange_rates (base_currency_code, quote_currency_code, as_of DESC);

-- Append-only: reuses the block_mutation() function defined in migration 003.
CREATE TRIGGER trg_exchange_rates_immutable
  BEFORE UPDATE OR DELETE ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION public.block_mutation();

CREATE OR REPLACE FUNCTION public.get_latest_exchange_rate(p_base TEXT, p_quote TEXT)
RETURNS NUMERIC AS $$
  SELECT rate FROM public.exchange_rates
  WHERE base_currency_code = p_base AND quote_currency_code = p_quote
  ORDER BY as_of DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;


-- ---------------------------------------------------------------------------
-- 3. COUNTRY / CURRENCY COLUMNS ON EXISTING TABLES
-- All defaulted to India/INR so existing (mockup-era) rows and code paths
-- keep working unchanged; new dealers/orders/invoices in AE or MC set these
-- explicitly at creation time.
-- ---------------------------------------------------------------------------

-- firms: registered business jurisdiction + reporting currency
ALTER TABLE public.firms
  ADD COLUMN country_code  TEXT NOT NULL DEFAULT 'IN' REFERENCES public.countries(code),
  ADD COLUMN currency_code TEXT NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code);

-- warehouses: physical location's jurisdiction (drives which tax regime applies to dispatches from it)
ALTER TABLE public.warehouses
  ADD COLUMN country_code TEXT NOT NULL DEFAULT 'IN' REFERENCES public.countries(code);

-- dealers: currency their credit_limit / current_balance are denominated in
ALTER TABLE public.dealers
  ADD COLUMN currency_code TEXT NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code);

-- inventory: currency rate_per_gram is quoted in (follows the warehouse's country by convention)
ALTER TABLE public.inventory
  ADD COLUMN currency_code TEXT NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code);

-- orders: transaction currency + FX snapshot to the group reporting currency (INR) at order time,
-- so consolidated reporting across countries doesn't need to re-derive historical rates.
ALTER TABLE public.orders
  ADD COLUMN currency_code         TEXT          NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code),
  ADD COLUMN fx_rate_to_reporting  NUMERIC(18,8) NOT NULL DEFAULT 1 CHECK (fx_rate_to_reporting > 0);

-- invoices: transaction currency + generalized tax label/breakdown alongside the existing GST columns
ALTER TABLE public.invoices
  ADD COLUMN currency_code  TEXT  NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code),
  ADD COLUMN tax_label      TEXT  NOT NULL DEFAULT 'GST', -- 'GST' (India), 'VAT' (UAE), 'None' (Monaco)
  ADD COLUMN tax_breakdown  JSONB;                        -- e.g. {"cgst":..,"sgst":..} or {"vat":..} or {}

COMMENT ON COLUMN public.invoices.cgst IS 'India-specific GST split (intra-state). 0 for non-GST jurisdictions; use tax_breakdown for their structure instead.';
COMMENT ON COLUMN public.invoices.sgst IS 'India-specific GST split (intra-state). 0 for non-GST jurisdictions; use tax_breakdown for their structure instead.';
COMMENT ON COLUMN public.invoices.igst IS 'India-specific GST split (inter-state). 0 for non-GST jurisdictions; use tax_breakdown for their structure instead.';
COMMENT ON COLUMN public.invoices.total_gst IS 'Total tax amount regardless of jurisdiction (GST, VAT, or 0 for no-tax); name retained for backward compatibility.';
COMMENT ON COLUMN public.products.gst_rate IS 'Generic tax rate (fraction, e.g. 0.03 = 3%) reused across jurisdictions: GST in India, VAT in the UAE, 0 in Monaco.';
COMMENT ON COLUMN public.order_items.gst_rate IS 'Generic tax rate applied at order time; see products.gst_rate.';

-- ledger_entries: currency the amount / balance_after are denominated in
ALTER TABLE public.ledger_entries
  ADD COLUMN currency_code TEXT NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code);


-- ---------------------------------------------------------------------------
-- Indexes for country/currency filtering
-- ---------------------------------------------------------------------------
CREATE INDEX idx_firms_country        ON public.firms (country_code);
CREATE INDEX idx_warehouses_country   ON public.warehouses (country_code);
CREATE INDEX idx_orders_currency      ON public.orders (currency_code);
CREATE INDEX idx_invoices_currency    ON public.invoices (currency_code);
CREATE INDEX idx_ledger_currency      ON public.ledger_entries (currency_code);


-- ---------------------------------------------------------------------------
-- 4. RLS FOR NEW REFERENCE TABLES
-- countries/currencies/exchange_rates are shared, non-sensitive reference
-- data: readable by any authenticated user, writable only via service role
-- (no INSERT/UPDATE/DELETE policy is defined for authenticated users, and
-- RLS does not apply to the service role).
-- ---------------------------------------------------------------------------
ALTER TABLE public.currencies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates  ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_read_currencies ON public.currencies
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY authenticated_read_countries ON public.countries
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY authenticated_read_exchange_rates ON public.exchange_rates
  FOR SELECT TO authenticated USING (TRUE);
