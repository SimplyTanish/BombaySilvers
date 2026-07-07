-- =============================================================================
-- Bombay Silvers Dealer Terminal — Row Level Security Policies
-- Migration: 20260707000002_rls_policies.sql
--
-- Roles:
--   super_admin — unrestricted access to everything
--   admin       — full read/write; cannot manage other admins/super_admins
--   staff       — read-only on most tables; limited write on orders/inventory
--   dealer      — strictly scoped to their own data only (IDOR-safe)
--
-- Design principle: DENY by default. Every table has RLS enabled.
-- Policies are additive — a row is accessible if ANY applicable policy permits it.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- SECURITY DEFINER HELPERS
-- These run with elevated privileges so they can read public.users without
-- triggering infinite RLS recursion.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_my_dealer_id()
RETURNS UUID AS $$
  SELECT id FROM public.dealers WHERE user_id = auth.uid() AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT get_my_role() = 'super_admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS BOOLEAN AS $$
  SELECT get_my_role() IN ('super_admin', 'admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_staff_or_above()
RETURNS BOOLEAN AS $$
  SELECT get_my_role() IN ('super_admin', 'admin', 'staff');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_dealer()
RETURNS BOOLEAN AS $$
  SELECT get_my_role() = 'dealer';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE public.users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firms                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs            ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (prevents accidental bypass).
ALTER TABLE public.users                  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.firms                  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.dealers                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.products               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inventory              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.orders                 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.order_items            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoices               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.referrals              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sessions               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs             FORCE ROW LEVEL SECURITY;


-- =============================================================================
-- TABLE: users
-- =============================================================================

-- Staff/admin/super_admin can see all non-deleted users.
CREATE POLICY "staff_read_all_users"
  ON public.users FOR SELECT
  USING (is_staff_or_above() AND deleted_at IS NULL);

-- A dealer can only read their own user row.
CREATE POLICY "dealer_read_own_user"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- A user can update their own non-sensitive profile fields.
CREATE POLICY "user_update_own_profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-promotion: role must not change via this policy.
    -- Role changes are handled by admin-only policies below.
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  );

-- Super admin can update any user (including role changes).
CREATE POLICY "super_admin_manage_users"
  ON public.users FOR ALL
  USING (is_super_admin());

-- Admin can update staff and dealer accounts, but not other admins or super_admins.
CREATE POLICY "admin_manage_non_admin_users"
  ON public.users FOR UPDATE
  USING (
    is_admin_or_above()
    AND (SELECT role FROM public.users WHERE id = users.id) IN ('staff', 'dealer')
  )
  WITH CHECK (
    role IN ('staff', 'dealer')   -- admins cannot promote to admin or above
  );

-- Only super_admin can INSERT new users directly (normal users created via auth trigger).
CREATE POLICY "super_admin_insert_users"
  ON public.users FOR INSERT
  WITH CHECK (is_super_admin());

-- Super admin soft-delete only.
CREATE POLICY "super_admin_delete_users"
  ON public.users FOR DELETE
  USING (is_super_admin());


-- =============================================================================
-- TABLE: firms
-- =============================================================================

-- Staff and above read all.
CREATE POLICY "staff_read_all_firms"
  ON public.firms FOR SELECT
  USING (is_staff_or_above());

-- Dealer reads only their own firm.
CREATE POLICY "dealer_read_own_firm"
  ON public.firms FOR SELECT
  USING (
    id IN (SELECT firm_id FROM public.dealers WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

-- Dealer can create and update their own firm.
CREATE POLICY "dealer_insert_own_firm"
  ON public.firms FOR INSERT
  WITH CHECK (TRUE);  -- Scoped server-side: insert via service role after dealer creation.

CREATE POLICY "dealer_update_own_firm"
  ON public.firms FOR UPDATE
  USING (
    id IN (SELECT firm_id FROM public.dealers WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

-- Admins manage all firms.
CREATE POLICY "admin_manage_all_firms"
  ON public.firms FOR ALL
  USING (is_admin_or_above());


-- =============================================================================
-- TABLE: dealers
-- =============================================================================

-- Staff and above read all non-deleted dealers.
CREATE POLICY "staff_read_all_dealers"
  ON public.dealers FOR SELECT
  USING (is_staff_or_above() AND deleted_at IS NULL);

-- Dealer reads only their own dealer row.
CREATE POLICY "dealer_read_own_dealer"
  ON public.dealers FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Dealer can update ONLY their own row, and only safe fields.
-- Privileged fields (status, tier, credit_limit, current_balance, firm_id, referred_by)
-- must not change. We enforce this by requiring them to match the committed DB value.
-- A SECURITY DEFINER function is used to read the old row without RLS recursion.
CREATE POLICY "dealer_update_own_dealer"
  ON public.dealers FOR UPDATE
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (
    user_id = auth.uid()
    -- These four fields are server-managed; dealers cannot change them.
    AND status        = (SELECT status        FROM public.dealers WHERE id = dealers.id AND user_id = auth.uid())
    AND tier          = (SELECT tier          FROM public.dealers WHERE id = dealers.id AND user_id = auth.uid())
    AND credit_limit  = (SELECT credit_limit  FROM public.dealers WHERE id = dealers.id AND user_id = auth.uid())
    AND current_balance = (SELECT current_balance FROM public.dealers WHERE id = dealers.id AND user_id = auth.uid())
    -- firm_id lock prevents IDOR: dealer cannot point their dealer row at another firm.
    AND firm_id       IS NOT DISTINCT FROM (SELECT firm_id FROM public.dealers WHERE id = dealers.id AND user_id = auth.uid())
    -- referred_by is immutable after set.
    AND referred_by   IS NOT DISTINCT FROM (SELECT referred_by FROM public.dealers WHERE id = dealers.id AND user_id = auth.uid())
  );

-- Admin manages all dealers.
CREATE POLICY "admin_manage_all_dealers"
  ON public.dealers FOR ALL
  USING (is_admin_or_above());

-- New dealer registration (INSERT) happens via service role during onboarding.
CREATE POLICY "super_admin_insert_dealer"
  ON public.dealers FOR INSERT
  WITH CHECK (is_super_admin());


-- =============================================================================
-- TABLE: kyc_documents
-- =============================================================================

-- Dealer: read only their own documents.
CREATE POLICY "dealer_read_own_kyc"
  ON public.kyc_documents FOR SELECT
  USING (dealer_id = get_my_dealer_id());

-- Dealer: insert their own documents.
CREATE POLICY "dealer_insert_own_kyc"
  ON public.kyc_documents FOR INSERT
  WITH CHECK (dealer_id = get_my_dealer_id());

-- Dealer: update (re-upload) only their own pending/rejected documents.
CREATE POLICY "dealer_update_own_pending_kyc"
  ON public.kyc_documents FOR UPDATE
  USING (
    dealer_id = get_my_dealer_id()
    AND status IN ('pending', 'rejected')
  )
  WITH CHECK (
    dealer_id = get_my_dealer_id()
    AND status IN ('pending', 'rejected')
    -- Dealers cannot change status; only admins do.
  );

-- Staff: read all KYC documents for review.
CREATE POLICY "staff_read_all_kyc"
  ON public.kyc_documents FOR SELECT
  USING (is_staff_or_above());

-- Admin: full management (review, status updates).
CREATE POLICY "admin_manage_all_kyc"
  ON public.kyc_documents FOR ALL
  USING (is_admin_or_above());


-- =============================================================================
-- TABLE: warehouses
-- =============================================================================

-- Everyone authenticated can read active warehouses (dealers need to see stock locations).
CREATE POLICY "authenticated_read_active_warehouses"
  ON public.warehouses FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- Staff and above read all (including inactive).
CREATE POLICY "staff_read_all_warehouses"
  ON public.warehouses FOR SELECT
  USING (is_staff_or_above());

-- Admin manages warehouses.
CREATE POLICY "admin_manage_warehouses"
  ON public.warehouses FOR ALL
  USING (is_admin_or_above());


-- =============================================================================
-- TABLE: products
-- =============================================================================

-- All authenticated users can read active products.
CREATE POLICY "authenticated_read_active_products"
  ON public.products FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- Staff read all (including inactive).
CREATE POLICY "staff_read_all_products"
  ON public.products FOR SELECT
  USING (is_staff_or_above());

-- Admin manages the product catalog.
CREATE POLICY "admin_manage_products"
  ON public.products FOR ALL
  USING (is_admin_or_above());


-- =============================================================================
-- TABLE: inventory
-- =============================================================================

-- All authenticated users can read inventory (dealers need to see availability).
CREATE POLICY "authenticated_read_inventory"
  ON public.inventory FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin and staff manage inventory.
CREATE POLICY "staff_manage_inventory"
  ON public.inventory FOR ALL
  USING (is_staff_or_above());


-- =============================================================================
-- TABLE: inventory_transactions
-- =============================================================================

-- Staff and above read all transactions (audit trail).
CREATE POLICY "staff_read_inventory_transactions"
  ON public.inventory_transactions FOR SELECT
  USING (is_staff_or_above());

-- Only service role / admin can insert (append-only, never update/delete).
CREATE POLICY "admin_insert_inventory_transactions"
  ON public.inventory_transactions FOR INSERT
  WITH CHECK (is_staff_or_above());

-- Nobody can UPDATE or DELETE inventory_transactions (enforced by having no such policies).


-- =============================================================================
-- TABLE: orders
-- CRITICAL: Dealers must only see their OWN orders. IDOR risk.
-- =============================================================================

-- Dealer: read only orders where they are the dealer.
CREATE POLICY "dealer_read_own_orders"
  ON public.orders FOR SELECT
  USING (
    dealer_id = get_my_dealer_id()
    AND deleted_at IS NULL
  );

-- Dealer: create orders only for themselves.
CREATE POLICY "dealer_insert_own_orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    dealer_id = get_my_dealer_id()
  );

-- Dealer: update only their own draft/pending orders (e.g. edit delivery notes).
-- WITH CHECK enforces the new row cannot escalate status beyond pending.
CREATE POLICY "dealer_update_own_draft_orders"
  ON public.orders FOR UPDATE
  USING (
    dealer_id = get_my_dealer_id()
    AND status IN ('draft', 'pending')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    dealer_id = get_my_dealer_id()
    -- Dealers cannot transition status forward; service role handles confirmed→dispatched etc.
    AND status IN ('draft', 'pending')
    -- Dealers cannot change grand_total, gst, or dealer_id.
    AND grand_total = (SELECT grand_total FROM public.orders WHERE id = orders.id)
    AND total_gst   = (SELECT total_gst   FROM public.orders WHERE id = orders.id)
  );

-- Staff: read all orders.
CREATE POLICY "staff_read_all_orders"
  ON public.orders FOR SELECT
  USING (is_staff_or_above());

-- Admin: full management.
CREATE POLICY "admin_manage_all_orders"
  ON public.orders FOR ALL
  USING (is_admin_or_above());


-- =============================================================================
-- TABLE: order_items
-- CRITICAL: Scoped through order ownership. IDOR risk.
-- =============================================================================

-- Dealer: read only items belonging to their own orders.
CREATE POLICY "dealer_read_own_order_items"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE dealer_id = get_my_dealer_id() AND deleted_at IS NULL
    )
  );

-- Dealer: insert items for their own draft orders only.
CREATE POLICY "dealer_insert_own_order_items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders
      WHERE dealer_id = get_my_dealer_id() AND status = 'draft'
    )
  );

-- Staff: read all order items.
CREATE POLICY "staff_read_all_order_items"
  ON public.order_items FOR SELECT
  USING (is_staff_or_above());

-- Admin: full management.
CREATE POLICY "admin_manage_all_order_items"
  ON public.order_items FOR ALL
  USING (is_admin_or_above());


-- =============================================================================
-- TABLE: invoices
-- CRITICAL: Dealers must only see their OWN invoices. IDOR risk.
-- =============================================================================

-- Dealer: read only their own invoices.
CREATE POLICY "dealer_read_own_invoices"
  ON public.invoices FOR SELECT
  USING (dealer_id = get_my_dealer_id());

-- Dealers cannot insert/update/delete invoices (generated by the system).

-- Staff: read all invoices.
CREATE POLICY "staff_read_all_invoices"
  ON public.invoices FOR SELECT
  USING (is_staff_or_above());

-- Admin: full management.
CREATE POLICY "admin_manage_all_invoices"
  ON public.invoices FOR ALL
  USING (is_admin_or_above());


-- =============================================================================
-- TABLE: ledger_entries
-- CRITICAL: Dealers must only see their OWN ledger. IDOR risk.
-- =============================================================================

-- Dealer: read only their own ledger entries.
CREATE POLICY "dealer_read_own_ledger"
  ON public.ledger_entries FOR SELECT
  USING (dealer_id = get_my_dealer_id());

-- Dealers cannot insert/update/delete ledger entries (only service role).

-- Staff: read all ledger entries.
CREATE POLICY "staff_read_all_ledger"
  ON public.ledger_entries FOR SELECT
  USING (is_staff_or_above());

-- Admin: read all + INSERT new entries (adjustments, payments, etc.).
-- NO UPDATE or DELETE policy exists → ledger is append-only for everyone including admins.
CREATE POLICY "admin_read_all_ledger"
  ON public.ledger_entries FOR SELECT
  USING (is_admin_or_above());

CREATE POLICY "admin_insert_ledger_entry"
  ON public.ledger_entries FOR INSERT
  WITH CHECK (is_admin_or_above());


-- =============================================================================
-- TABLE: referrals
-- CRITICAL: Dealers must only see referrals they initiated. IDOR risk.
-- =============================================================================

-- Dealer: read only referrals where they are the referrer.
CREATE POLICY "dealer_read_own_referrals"
  ON public.referrals FOR SELECT
  USING (referrer_id = get_my_dealer_id());

-- Dealer: create new referral invites.
CREATE POLICY "dealer_insert_own_referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (referrer_id = get_my_dealer_id());

-- Dealers cannot update referral status (system-managed via service role).

-- Staff: read all referrals.
CREATE POLICY "staff_read_all_referrals"
  ON public.referrals FOR SELECT
  USING (is_staff_or_above());

-- Admin: full management.
CREATE POLICY "admin_manage_all_referrals"
  ON public.referrals FOR ALL
  USING (is_admin_or_above());


-- =============================================================================
-- TABLE: notifications
-- CRITICAL: Users must only see their OWN notifications. IDOR risk.
-- =============================================================================

-- User: read only their own notifications.
CREATE POLICY "user_read_own_notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- User: mark their own notifications as read.
CREATE POLICY "user_update_own_notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Only allow is_read and read_at to change; enforce field-level on app layer.
  );

-- Users cannot insert notifications for themselves (system/service role only).

-- Admin: full management.
CREATE POLICY "admin_manage_all_notifications"
  ON public.notifications FOR ALL
  USING (is_admin_or_above());


-- =============================================================================
-- TABLE: sessions
-- =============================================================================

-- User: read only their own sessions.
CREATE POLICY "user_read_own_sessions"
  ON public.sessions FOR SELECT
  USING (user_id = auth.uid());

-- User: revoke (update revoked_at) on their own sessions.
CREATE POLICY "user_revoke_own_sessions"
  ON public.sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User: insert new session at login (done via service role on the API layer).
CREATE POLICY "user_insert_own_session"
  ON public.sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admin: full visibility and revocation.
CREATE POLICY "admin_manage_all_sessions"
  ON public.sessions FOR ALL
  USING (is_admin_or_above());


-- =============================================================================
-- TABLE: audit_logs
-- Append-only. No one can update or delete audit logs.
-- =============================================================================

-- Staff and above can read all audit logs.
CREATE POLICY "staff_read_audit_logs"
  ON public.audit_logs FOR SELECT
  USING (is_staff_or_above());

-- Super admin reads everything.
CREATE POLICY "super_admin_read_audit_logs"
  ON public.audit_logs FOR SELECT
  USING (is_super_admin());

-- Any authenticated user can insert an audit log (write via service role in practice).
-- No UPDATE or DELETE policies exist → those operations are blocked for all users.
CREATE POLICY "authenticated_insert_audit_log"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- =============================================================================
-- GRANT STATEMENTS
-- =============================================================================

-- Allow the 'authenticated' role (all logged-in users) to use these tables.
-- Actual row visibility is controlled by the RLS policies above.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- The 'anon' role should have no access to any business data.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
