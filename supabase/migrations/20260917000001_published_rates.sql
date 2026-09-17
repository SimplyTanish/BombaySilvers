-- =============================================================================
-- published_rates — admin-controlled daily bullion rate sheet
--
-- Bombay Silvers admin manually publishes buy/sell rates for each metal/purity.
-- Dealers see the LATEST published row; invoices store their own rate snapshot
-- in order_items.unit_price, so historical invoices never change.
--
-- Append-only + immutable (reversal = new row), mirroring the ledger rules.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.published_rates (
  id            UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  metal         public.metal_type     NOT NULL,
  purity        NUMERIC(5,2)          NOT NULL DEFAULT 99.90,
  label         TEXT                  NOT NULL,               -- e.g. "Gold 24K"
  unit           TEXT                  NOT NULL DEFAULT 'gram',
  buy_rate      NUMERIC(18,4)         NOT NULL CHECK (buy_rate > 0),
  sell_rate     NUMERIC(18,4)         NOT NULL CHECK (sell_rate > 0),
  currency_code TEXT                  NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code),
  published_by  UUID                  REFERENCES public.users(id) ON DELETE SET NULL,
  published_at  TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_published_rates_metal
  ON public.published_rates (metal, published_at DESC);

-- Immutable: rates are never edited/deleted — a new publish creates a new row.
CREATE TRIGGER trg_published_rates_immutable
  BEFORE UPDATE OR DELETE ON public.published_rates
  FOR EACH ROW EXECUTE FUNCTION public.block_mutation();

-- =============================================================================
-- View: latest published rate per metal (for dealer dashboards / rate sheet)
-- =============================================================================
CREATE OR REPLACE VIEW public.latest_rates AS
SELECT DISTINCT ON (metal)
  metal, purity, label, unit, buy_rate, sell_rate, currency_code, published_at
FROM public.published_rates
ORDER BY metal, published_at DESC;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.published_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_rates FORCE ROW LEVEL SECURITY;

-- All authenticated users can read the published rate sheet.
CREATE POLICY "authenticated_read_published_rates"
  ON public.published_rates FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins (and above) may publish rates.
CREATE POLICY "admin_insert_published_rates"
  ON public.published_rates FOR INSERT
  WITH CHECK (is_admin_or_above());

-- No UPDATE/DELETE policies → immutable once published (append-only).

-- Grant view access to authenticated role via the view's underlying policy.
GRANT SELECT ON public.latest_rates TO authenticated;