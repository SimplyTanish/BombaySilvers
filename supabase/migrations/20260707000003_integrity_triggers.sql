-- =============================================================================
-- Bombay Silvers Dealer Terminal — Integrity Triggers & Constraints
-- Migration: 20260707000003_integrity_triggers.sql
--
-- Applies:
--   1. invoice.dealer_id must match order.dealer_id (cross-table FK consistency)
--   2. audit_logs / inventory_transactions / ledger_entries: DB-level append-only lock
--   3. Dealer privileged-field protection via trigger (belt-and-suspenders with RLS)
--   4. inventory quantity sanity: available + reserved must not exceed total
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. INVOICE ↔ ORDER DEALER CONSISTENCY
-- Prevents creating an invoice whose dealer_id differs from the owning order.
-- Without this, financial records could be misattributed across dealers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_invoice_dealer_matches_order()
RETURNS TRIGGER AS $$
DECLARE
  order_dealer_id UUID;
BEGIN
  SELECT dealer_id INTO order_dealer_id
  FROM public.orders
  WHERE id = NEW.order_id;

  IF order_dealer_id IS NULL THEN
    RAISE EXCEPTION 'Invoice references non-existent order %', NEW.order_id;
  END IF;

  IF order_dealer_id <> NEW.dealer_id THEN
    RAISE EXCEPTION
      'Invoice dealer_id (%) does not match order dealer_id (%). Financial record mismatch.',
      NEW.dealer_id, order_dealer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_invoice_dealer_consistency
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.check_invoice_dealer_matches_order();


-- ---------------------------------------------------------------------------
-- 2. APPEND-ONLY ENFORCEMENT
-- These three tables are immutable after INSERT.
-- The trigger fires on any UPDATE or DELETE attempt and raises an exception.
-- This acts as a belt-and-suspenders backstop behind the absent RLS policies.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'Table "%" is append-only. UPDATE and DELETE are not permitted. Table: %, Operation: %',
    TG_TABLE_NAME, TG_TABLE_NAME, TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ledger_entries: financial records must never change
CREATE TRIGGER trg_ledger_entries_immutable
  BEFORE UPDATE OR DELETE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.block_mutation();

-- inventory_transactions: stock movement audit trail
CREATE TRIGGER trg_inventory_transactions_immutable
  BEFORE UPDATE OR DELETE ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.block_mutation();

-- audit_logs: security audit trail
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.block_mutation();


-- ---------------------------------------------------------------------------
-- 3. DEALER PRIVILEGED FIELD PROTECTION (belt-and-suspenders with RLS)
-- Prevents any UPDATE — including admin API calls that bypass RLS — from
-- modifying status/tier/credit_limit/current_balance via the application
-- user. These fields may only be changed by server-side service-role code
-- that sets a session flag (app.bypass_dealer_field_lock = 'true').
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_dealer_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Service role can set this flag to bypass the lock for legitimate updates.
  IF current_setting('app.bypass_dealer_field_lock', TRUE) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Block any privileged field change from normal application connections.
  IF OLD.status        IS DISTINCT FROM NEW.status THEN
    RAISE EXCEPTION 'dealers.status may only be changed by the service role.';
  END IF;
  IF OLD.tier          IS DISTINCT FROM NEW.tier THEN
    RAISE EXCEPTION 'dealers.tier may only be changed by the service role.';
  END IF;
  IF OLD.credit_limit  IS DISTINCT FROM NEW.credit_limit THEN
    RAISE EXCEPTION 'dealers.credit_limit may only be changed by the service role.';
  END IF;
  IF OLD.current_balance IS DISTINCT FROM NEW.current_balance THEN
    RAISE EXCEPTION 'dealers.current_balance may only be changed by the service role.';
  END IF;
  IF OLD.firm_id IS DISTINCT FROM NEW.firm_id THEN
    RAISE EXCEPTION 'dealers.firm_id is immutable after assignment. Changing it is not permitted.';
  END IF;
  IF OLD.referred_by IS DISTINCT FROM NEW.referred_by THEN
    RAISE EXCEPTION 'dealers.referred_by is immutable after assignment.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_protect_dealer_fields
  BEFORE UPDATE ON public.dealers
  FOR EACH ROW EXECUTE FUNCTION public.protect_dealer_privileged_fields();

-- Service role usage example (in server-side code only):
-- await supabaseServiceClient.rpc('set_config', { key: 'app.bypass_dealer_field_lock', value: 'true', is_local: true })
-- await supabaseServiceClient.from('dealers').update({ status: 'active' }).eq('id', dealerId)


-- ---------------------------------------------------------------------------
-- 4. ORDER STATUS TRANSITION MACHINE
-- Prevents invalid status hops (e.g. draft → delivered directly).
-- Valid transitions defined below; all others raise an exception.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- No-op if status unchanged.
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Service role bypass (for emergency corrections).
  IF current_setting('app.bypass_order_status_lock', TRUE) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Valid forward transitions:
  IF (OLD.status = 'draft'      AND NEW.status = 'pending')    THEN RETURN NEW; END IF;
  IF (OLD.status = 'pending'    AND NEW.status = 'confirmed')  THEN RETURN NEW; END IF;
  IF (OLD.status = 'confirmed'  AND NEW.status = 'dispatched') THEN RETURN NEW; END IF;
  IF (OLD.status = 'dispatched' AND NEW.status = 'in_transit') THEN RETURN NEW; END IF;
  IF (OLD.status = 'in_transit' AND NEW.status = 'delivered')  THEN RETURN NEW; END IF;

  -- Cancellation from any non-terminal state is allowed.
  IF NEW.status = 'cancelled' AND OLD.status NOT IN ('delivered', 'cancelled') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Invalid order status transition: % → %. Allowed transitions: draft→pending, pending→confirmed, confirmed→dispatched, dispatched→in_transit, in_transit→delivered, or any→cancelled.',
    OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_order_status_machine
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();


-- ---------------------------------------------------------------------------
-- 5. INVENTORY QUANTITY SANITY
-- reserved must not exceed available + reserved (i.e., no negative available).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_inventory_quantities()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_reserved > (NEW.quantity_available + NEW.quantity_reserved) THEN
    RAISE EXCEPTION
      'inventory.quantity_reserved (%) cannot exceed total stock for product % at warehouse %.',
      NEW.quantity_reserved, NEW.product_id, NEW.warehouse_id;
  END IF;
  -- Available must never go below zero (covered by CHECK but also enforced here for clarity).
  IF NEW.quantity_available < 0 THEN
    RAISE EXCEPTION
      'inventory.quantity_available cannot be negative for product % at warehouse %.',
      NEW.product_id, NEW.warehouse_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_inventory_quantity_sanity
  BEFORE INSERT OR UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.check_inventory_quantities();
