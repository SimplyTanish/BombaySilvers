# Bombay Silvers — Database Security & Architecture Review
**Date:** 2026-07-07  
**Scope:** Migrations 001–003 (schema, RLS, triggers)  
**Reviewer:** Senior Security & Architecture Review  

---

## Executive Summary

| Dimension      | Score | Rationale |
|----------------|-------|-----------|
| **Security**   | 6.5/10 | Strong foundation (FORCE RLS, append-only, state machine) undermined by audit log forgery, RLS recursion bombs, and an open firm-insert policy |
| **Scalability** | 4/10 | Hard-blocked on multi-currency and multi-country: no `currency` or `country` columns anywhere; India-only tax model baked into the core schema |

---

## Section 1 — Table Relationships & FK Correctness

### ✅ Correct Relationships
| Table | FK | ON DELETE | Verdict |
|---|---|---|---|
| `users` | `auth.users(id)` | CASCADE | ✓ Correct |
| `dealers.user_id` | `users(id)` | CASCADE | ✓ Correct |
| `dealers.firm_id` | `firms(id)` | SET NULL | ✓ Correct |
| `dealers.referred_by` | `dealers(id)` | SET NULL | ✓ Correct (self-ref) |
| `kyc_documents.dealer_id` | `dealers(id)` | CASCADE | ✓ Correct |
| `kyc_documents.reviewed_by` | `users(id)` | SET NULL | ✓ Correct |
| `inventory.product_id` | `products(id)` | RESTRICT | ✓ Correct |
| `inventory.warehouse_id` | `warehouses(id)` | RESTRICT | ✓ Correct |
| `inventory_transactions.inventory_id` | `inventory(id)` | RESTRICT | ✓ Correct |
| `orders.dealer_id` | `dealers(id)` | RESTRICT | ✓ Correct |
| `order_items.order_id` | `orders(id)` | CASCADE | ✓ Correct |
| `order_items.product_id` | `products(id)` | RESTRICT | ✓ Correct |
| `invoices.order_id` | `orders(id)` | RESTRICT + UNIQUE | ✓ Correct (1:1) |
| `invoices.dealer_id` | `dealers(id)` | RESTRICT | ✓ Correct |
| `ledger_entries.dealer_id` | `dealers(id)` | RESTRICT | ✓ Correct |
| `referrals.referrer_id` | `dealers(id)` | RESTRICT | ✓ Correct |
| `referrals.referred_dealer_id` | `dealers(id)` | SET NULL | ✓ Correct |
| `notifications.user_id` | `users(id)` | CASCADE | ✓ Correct |
| `sessions.user_id` | `users(id)` | CASCADE | ✓ Correct |

### ⚠️ Missing / Weak FKs
| Location | Issue | Severity |
|---|---|---|
| `inventory_transactions.reference_id` | Polymorphic UUID — no FK. Orphaned references if orders/transfers are deleted | MEDIUM |
| `ledger_entries.reference_id` | Same polymorphic pattern — no FK | MEDIUM |
| `audit_logs.entity_id` | No FK — expected, but note that deleted entities leave dangling `entity_id` values | LOW |

---

## Section 2 — Orphan Record Risks

| Risk | Path | Severity |
|---|---|---|
| `firms` without a `dealer` | `dealer_insert_own_firm WITH CHECK (TRUE)` lets any dealer INSERT a `firms` row. If the server crashes before assigning `dealers.firm_id`, you get an orphaned firm row with no owner | HIGH |
| Referral chain gaps | Deleting a top-level dealer sets `referred_by = NULL` on downstream dealers but does not update the `referrals` table `referred_dealer_id`. The referral record becomes a partial orphan (referrer still exists, linkage broken) | MEDIUM |
| Polymorphic refs | `inventory_transactions` and `ledger_entries` hold `reference_id` pointing at orders/invoices. If an order is hard-deleted (only soft-delete exists today, but the column allows it), the transaction audit trail loses its context | LOW |

---

## Section 3 — Dealer A / Dealer B Isolation

### ✅ Correctly Isolated
- `orders`: `dealer_id = get_my_dealer_id()` on SELECT, INSERT, UPDATE — clean
- `invoices`: `dealer_id = get_my_dealer_id()` on SELECT — clean
- `ledger_entries`: `dealer_id = get_my_dealer_id()` on SELECT — clean
- `kyc_documents`: `dealer_id = get_my_dealer_id()` on SELECT/INSERT — clean
- `referrals`: `referrer_id = get_my_dealer_id()` on SELECT/INSERT — clean
- `order_items`: scoped via sub-SELECT on `orders` — clean
- `notifications`: `user_id = auth.uid()` — clean

### ❌ IDOR Findings

**IDOR-1 — Firm INSERT is open to all dealers (HIGH)**
```sql
-- CURRENT (BROKEN):
CREATE POLICY "dealer_insert_own_firm"
  ON public.firms FOR INSERT
  WITH CHECK (TRUE);   -- ← any authenticated dealer can insert ANY firm
```
Any dealer can spam the `firms` table with arbitrary data. The comment says "scoped server-side" but there is no server-side constraint enforcing this. A dealer could also INSERT a firm and then manipulate it before their `dealers.firm_id` is set.

**IDOR-2 — Inventory rate leakage (MEDIUM)**
```sql
CREATE POLICY "authenticated_read_inventory"
  ON public.inventory FOR SELECT
  USING (auth.uid() IS NOT NULL);
```
All dealers can read `rate_per_gram` and exact stock levels across ALL warehouses and products. If rates are dealer-tier-specific or commercially sensitive, this exposes pricing strategy across all dealers.

---

## Section 4 — RLS Policy Completeness & Security

### ❌ CRITICAL: Audit Log Forgery

```sql
-- CURRENT (BROKEN):
CREATE POLICY "authenticated_insert_audit_log"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```
**Any authenticated dealer** can insert rows into `audit_logs` with any `action`, `entity_type`, `entity_id`, `old_values`, `new_values`. A malicious dealer could:
- Insert fake `kyc_reviewed` entries to fabricate approval history
- Insert fake `login` / `otp_verified` events to manufacture an alibi
- Pollute the audit trail making forensic analysis unreliable

**Fix:**
```sql
-- Remove the authenticated policy entirely.
-- Audit logs must only be written by service role (no RLS policy = no access for app users).
DROP POLICY "authenticated_insert_audit_log" ON public.audit_logs;
-- Service role bypasses RLS by design. API layer writes audit logs using createAdminClient().
```

---

### ❌ CRITICAL: RLS Self-Recursion in `admin_manage_non_admin_users`

```sql
-- CURRENT (BROKEN):
CREATE POLICY "admin_manage_non_admin_users"
  ON public.users FOR UPDATE
  USING (
    is_admin_or_above()
    AND (SELECT role FROM public.users WHERE id = users.id) IN ('staff', 'dealer')
    --   ^^^^^^^^ hits public.users → re-triggers RLS → hits this policy again → infinite loop
  )
```
With `FORCE ROW LEVEL SECURITY`, the sub-SELECT on `public.users` inside a policy on `public.users` will recurse into RLS evaluation indefinitely on some PostgreSQL versions.

**Fix:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_role(target_id UUID)
RETURNS public.user_role AS $$
  SELECT role FROM public.users WHERE id = target_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Then rewrite policy:
CREATE POLICY "admin_manage_non_admin_users"
  ON public.users FOR UPDATE
  USING (
    is_admin_or_above()
    AND get_user_role(users.id) IN ('staff', 'dealer')
  )
  WITH CHECK (role IN ('staff', 'dealer'));
```

---

### ❌ HIGH: `dealer_update_own_dealer` — 6 Redundant Sub-SELECTs (RLS Recursion Risk)

```sql
WITH CHECK (
  user_id = auth.uid()
  AND status        = (SELECT status        FROM public.dealers WHERE id = dealers.id AND user_id = auth.uid())
  AND tier          = (SELECT tier          FROM public.dealers WHERE id = dealers.id AND user_id = auth.uid())
  AND credit_limit  = (SELECT credit_limit  FROM public.dealers WHERE id = dealers.id AND user_id = auth.uid())
  AND current_balance = (SELECT current_balance FROM public.dealers WHERE id = dealers.id AND user_id = auth.uid())
  AND firm_id       IS NOT DISTINCT FROM (SELECT firm_id FROM public.dealers WHERE id = dealers.id AND user_id = auth.uid())
  AND referred_by   IS NOT DISTINCT FROM (SELECT referred_by FROM public.dealers WHERE id = dealers.id AND user_id = auth.uid())
);
```
Six separate sub-queries each re-trigger RLS evaluation on `dealers`. Should use a SECURITY DEFINER function.

**Fix:**
```sql
CREATE OR REPLACE FUNCTION public.get_my_dealer_snapshot()
RETURNS public.dealers AS $$
  SELECT * FROM public.dealers WHERE user_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Policy WITH CHECK becomes:
WITH CHECK (
  user_id = auth.uid()
  AND (SELECT status        FROM public.get_my_dealer_snapshot()) = status
  AND (SELECT tier          FROM public.get_my_dealer_snapshot()) = tier
  AND (SELECT credit_limit  FROM public.get_my_dealer_snapshot()) = credit_limit
  AND (SELECT current_balance FROM public.get_my_dealer_snapshot()) = current_balance
  AND (SELECT firm_id       FROM public.get_my_dealer_snapshot()) IS NOT DISTINCT FROM firm_id
  AND (SELECT referred_by   FROM public.get_my_dealer_snapshot()) IS NOT DISTINCT FROM referred_by
);
```

---

### ❌ HIGH: Session Injection

```sql
CREATE POLICY "user_insert_own_session"
  ON public.sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());
```
Any user can register a fake device session with any `ip_address`, `user_agent`, `device_name`. This defeats the purpose of the session registry (detecting suspicious devices) and could be used to whitelist attacker IPs.

**Fix:** Remove this policy. Session records should only be created by the service role on the server after a verified login.

---

### ❌ MEDIUM: Notification Body Tampering

```sql
CREATE POLICY "user_update_own_notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
  -- ← No field restriction. User can change title, body, type, metadata.
```

**Fix:**
```sql
WITH CHECK (
  user_id = auth.uid()
  AND is_read = TRUE       -- can only mark as read
  AND title   = (SELECT title FROM public.notifications WHERE id = notifications.id)
  AND body    = (SELECT body  FROM public.notifications WHERE id = notifications.id)
);
```
Or restrict this entirely to service role and expose a `mark_notification_read(notification_id UUID)` RPC.

---

### ❌ MEDIUM: Suspended Dealers Can Place Orders

```sql
CREATE POLICY "dealer_insert_own_orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    dealer_id = get_my_dealer_id()
    -- ← No check that dealer.status = 'active'
  );
```
A `suspended`, `pending_kyc`, or `rejected` dealer can create orders.

**Fix:**
```sql
WITH CHECK (
  dealer_id = get_my_dealer_id()
  AND (SELECT status FROM public.dealers WHERE id = get_my_dealer_id()) = 'active'
);
```

---

### ❌ MEDIUM: Staff Can Delete Inventory

```sql
CREATE POLICY "staff_manage_inventory"
  ON public.inventory FOR ALL
  USING (is_staff_or_above());
```
Staff have DELETE on `inventory` rows. Deleting an inventory row cascades issues to `inventory_transactions` (RESTRICT). This should be UPDATE-only for staff; only admins should delete.

**Fix:** Split into SELECT + INSERT + UPDATE for staff, and retain FOR ALL only for admins.

---

### ❌ MEDIUM: KYC Update — No Field Lock

The `dealer_update_own_pending_kyc` policy has no WITH CHECK field restriction. A dealer can change `document_type` on a pending document (violating the `UNIQUE(dealer_id, document_type)` constraint in unexpected ways), or tamper with `rejection_reason`.

---

## Section 5 — Privilege Escalation Findings

### ❌ ESC-1: `protect_dealer_privileged_fields` Blocks Legitimate Admin Operations (HIGH)

The trigger fires on ALL `UPDATE` statements to `dealers`, including admin/super_admin actions via the Supabase dashboard SQL editor. Any admin attempting to approve a dealer (`UPDATE dealers SET status = 'active'`) will get an exception unless they first set `app.bypass_dealer_field_lock = 'true'` in the same session.

The Supabase dashboard runs queries in plain sessions without this flag set. This means **no admin can approve a KYC from the dashboard** without a workaround.

**Fix:** Detect service role using `current_user = 'postgres'` or pass a signed JWT claim instead of a GUC setting, which can be spoofed:
```sql
-- SAFER: Check if running as service role (postgres superuser)
IF current_user IN ('postgres', 'service_role') THEN
  RETURN NEW;
END IF;
```

### ❌ ESC-2: `user_update_own_profile` Self-Promotion Race Condition (MEDIUM)

```sql
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  --          ^^^ reads the CURRENT committed role
)
```
If two concurrent UPDATE requests are issued (one legitimate, one attempting role escalation), the sub-SELECT could read a stale value between the USING check and the WITH CHECK in edge cases under high concurrency. Should be locked with `FOR UPDATE` or handled via a SECURITY DEFINER trigger.

### ❌ ESC-3: `dealer_insert_own_firm WITH CHECK (TRUE)` (HIGH)

As noted in IDOR-1, this allows any dealer to create firm records. While they cannot directly assign the firm to another dealer (that's locked by `firm_id` immutability), they can flood the `firms` table and waste firm IDs, or create confusion in admin workflows.

---

## Section 6 — Trigger Logic Bugs

### 🐛 BUG-1: `check_inventory_quantities` Is a No-Op (CRITICAL)

```sql
-- CURRENT (BROKEN):
IF NEW.quantity_reserved > (NEW.quantity_available + NEW.quantity_reserved) THEN
```
Simplifies algebraically to `IF 0 > NEW.quantity_available` — which is already enforced by the `CHECK (quantity_available >= 0)` column constraint. **The intended check (reserved ≤ total stock) is never enforced.**

Real-world impact: A staff member could set `quantity_reserved = 10,000` when only 100 units exist. Reserved inventory would exceed physical stock, leading to overselling.

**Root cause analysis:**

`inventory` encodes state as two complementary values: `quantity_available + quantity_reserved = total physical stock`. Because total = available + reserved, the expression `reserved > (available + reserved)` simplifies to `0 > available`, which is already enforced by the column's `CHECK (quantity_available >= 0)`. The trigger therefore runs on every INSERT/UPDATE and does nothing new.

The genuinely missing invariant is: **when a reservation is created (reserved increases), it must not exceed what was actually available at that moment.** The existing schema also has no `CHECK (quantity_reserved >= 0)`.

**Fix:**
```sql
-- 1. Add the missing non-negative constraint on reserved (schema fix, migration 004).
ALTER TABLE public.inventory
  ADD CONSTRAINT chk_quantity_reserved_non_negative
  CHECK (quantity_reserved >= 0);

-- 2. Rewrite the trigger to enforce the real reservation invariant.
CREATE OR REPLACE FUNCTION public.check_inventory_quantities()
RETURNS TRIGGER AS $
BEGIN
  -- Both quantities must be non-negative (belt-and-suspenders behind the CHECK constraints).
  IF NEW.quantity_available < 0 THEN
    RAISE EXCEPTION
      'quantity_available cannot be negative for product % at warehouse %.',
      NEW.product_id, NEW.warehouse_id;
  END IF;

  IF NEW.quantity_reserved < 0 THEN
    RAISE EXCEPTION
      'quantity_reserved cannot be negative for product % at warehouse %.',
      NEW.product_id, NEW.warehouse_id;
  END IF;

  -- On UPDATE: if the reservation increased, the delta must not exceed what
  -- was available before this update (prevents over-reservation).
  IF TG_OP = 'UPDATE' THEN
    IF NEW.quantity_reserved > OLD.quantity_reserved THEN
      IF (NEW.quantity_reserved - OLD.quantity_reserved) > OLD.quantity_available THEN
        RAISE EXCEPTION
          'Cannot reserve % additional units: only % available for product % at warehouse %.',
          (NEW.quantity_reserved - OLD.quantity_reserved),
          OLD.quantity_available,
          NEW.product_id,
          NEW.warehouse_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Section 7 — International Expansion Readiness

### 🌍 Country: India, UAE, Monaco

| Gap | Tables Affected | Severity |
|---|---|---|
| No `country_code` column | `firms`, `warehouses`, `orders`, `dealers` | CRITICAL |
| `delivery_pincode`, `delivery_state` are India-centric | `orders` | HIGH |
| `city + state + pincode` address model doesn't fit UAE (Emirates + P.O. Box) or Monaco | `firms`, `warehouses`, `orders` | HIGH |
| `gstin TEXT UNIQUE`, `pan_number TEXT UNIQUE` are India-only tax IDs | `firms` | HIGH |
| `hsn_code` is India GST classification | `products` | MEDIUM |
| `gst_rate NUMERIC(5,4) DEFAULT 0.03` hardcodes India 3% bullion rate | `products` | HIGH |
| `cgst`, `sgst`, `igst` columns are India-specific GST splits | `invoices` | HIGH |
| `generate_dealer_code(city)` generates `BS-MUM-XXXXX` — no country prefix | function | MEDIUM |
| `monthly_turnover_range TEXT` stores `"₹10L–₹50L"` — INR + lakh notation | `firms` | LOW |
| No timezone column — critical for UAE (GST 04:00) vs Monaco (CET/CEST) | `orders`, `invoices` | MEDIUM |

### Required Schema Changes for Expansion

```sql
-- 1. Add country support
CREATE TABLE public.countries (
  code        CHAR(2)  PRIMARY KEY,  -- ISO 3166-1 alpha-2
  name        TEXT     NOT NULL,
  currency    CHAR(3)  NOT NULL,     -- ISO 4217
  tax_system  TEXT     NOT NULL      -- 'gst', 'vat', 'none'
);
INSERT INTO public.countries VALUES ('IN','India','INR','gst'),('AE','UAE','AED','vat'),('MC','Monaco','EUR','vat');

-- 2. Add country to core tables
ALTER TABLE public.firms      ADD COLUMN country_code CHAR(2) NOT NULL DEFAULT 'IN' REFERENCES public.countries(code);
ALTER TABLE public.warehouses ADD COLUMN country_code CHAR(2) NOT NULL DEFAULT 'IN' REFERENCES public.countries(code);

-- 3. Replace India-only firm tax fields with generic tax_id
ALTER TABLE public.firms ADD COLUMN tax_id TEXT;   -- TRN for UAE, SIRET for France/Monaco, GSTIN for India
ALTER TABLE public.firms ADD COLUMN tax_id_type TEXT; -- 'gstin', 'trn', 'siret', etc.

-- 4. Replace India-only invoice tax columns with a JSONB tax breakdown
ALTER TABLE public.invoices ADD COLUMN tax_lines JSONB DEFAULT '[]';
-- Example: [{"type":"igst","rate":0.03,"amount":450.00},{"type":"vat","rate":0.05,"amount":750.00}]
-- Keep cgst/sgst/igst as nullable for backward compat during migration

-- 5. Add currency and country to orders
ALTER TABLE public.orders ADD COLUMN currency_code CHAR(3) NOT NULL DEFAULT 'INR';
ALTER TABLE public.orders ADD COLUMN delivery_country_code CHAR(2) NOT NULL DEFAULT 'IN';

-- 6. Generalize address fields on orders
ALTER TABLE public.orders ADD COLUMN delivery_postal_code TEXT;  -- replaces delivery_pincode
ALTER TABLE public.orders ADD COLUMN delivery_region TEXT;       -- replaces delivery_state (works for Emirates too)
```

---

## Section 8 — Multi-Currency Support

### INR / USD / EUR / AED

| Gap | Location | Severity |
|---|---|---|
| No `currency_code` column | `orders`, `invoices`, `ledger_entries`, `inventory` | CRITICAL |
| `rate_per_gram` on `inventory` has no currency — assumes INR | `inventory` | CRITICAL |
| `balance_after` on `ledger_entries` mixes currencies if dealer trades in multiple | `ledger_entries` | HIGH |
| No exchange rate table for cross-currency reporting | (missing table) | HIGH |
| `NUMERIC(18,2)` precision is fine for all 4 currencies | all | ✓ OK |

### Required Schema Changes for Multi-Currency

```sql
-- 1. Currency enum (or use ISO 4217 CHAR(3) TEXT — preferred for extensibility)
-- No enum needed; CHAR(3) with FK to a currencies table is more flexible.

-- 2. Add currency to financial tables
ALTER TABLE public.orders          ADD COLUMN currency_code CHAR(3) NOT NULL DEFAULT 'INR';
ALTER TABLE public.invoices        ADD COLUMN currency_code CHAR(3) NOT NULL DEFAULT 'INR';
ALTER TABLE public.ledger_entries  ADD COLUMN currency_code CHAR(3) NOT NULL DEFAULT 'INR';
ALTER TABLE public.inventory       ADD COLUMN rate_currency  CHAR(3) NOT NULL DEFAULT 'INR';

-- 3. Exchange rates table (for reporting, conversion)
CREATE TABLE public.exchange_rates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency CHAR(3)     NOT NULL,
  to_currency   CHAR(3)     NOT NULL,
  rate          NUMERIC(20,8) NOT NULL,
  source        TEXT,       -- 'manual', 'rbi', 'xe'
  effective_at  TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_currency, to_currency, effective_at)
);
CREATE INDEX idx_exchange_rates_pair ON public.exchange_rates (from_currency, to_currency, effective_at DESC);
```

---

## Summary: Required Fixes Before Authentication

These must be resolved **before** the authentication layer is built, as auth depends on the `users`, `dealers`, and `sessions` tables being correctly secured.

### 🔴 CRITICAL (Blocking)

| # | Fix | Migration |
|---|---|---|
| C1 | **Audit log forgery**: Drop `authenticated_insert_audit_log` policy. Audit writes must be service-role only | 002-patch |
| C2 | **Inventory sanity trigger is a no-op**: Rewrite `check_inventory_quantities` to actually check reserved ≤ total stock | 003-patch |
| C3 | **RLS recursion bomb**: Rewrite `admin_manage_non_admin_users` using a `SECURITY DEFINER` helper `get_user_role(UUID)` | 002-patch |
| C4 | **Add `currency_code` to `orders`, `invoices`, `ledger_entries`, `inventory`**: Without this, all financial data is implicitly INR and multi-currency is a destructive migration later | 004-expansion |
| C5 | **Add `country_code` to `firms`, `warehouses`, `orders`**: Same — adding this post-data is a migration nightmare | 004-expansion |

### 🟠 HIGH (Must Fix Before Auth Go-Live)

| # | Fix | Migration |
|---|---|---|
| H1 | **`dealer_insert_own_firm` open INSERT**: Change `WITH CHECK (TRUE)` to require a matching `dealers` row or restrict to service role | 002-patch |
| H2 | **`dealer_update_own_dealer` recursion**: Replace 6 sub-SELECTs with a single `get_my_dealer_snapshot()` SECURITY DEFINER function | 002-patch |
| H3 | **`user_insert_own_session` allows fake sessions**: Remove policy; session creation must be service-role only | 002-patch |
| H4 | **Suspended dealers can place orders**: Add `status = 'active'` check to `dealer_insert_own_orders` | 002-patch |
| H5 | **Admin blocked by `protect_dealer_privileged_fields`**: Replace GUC bypass flag with `current_user` check or service-role detection | 003-patch |
| H6 | **India-only tax structure in `invoices`**: Add `tax_lines JSONB` for international invoices; mark `cgst/sgst/igst` as India-specific | 004-expansion |

### 🟡 MEDIUM (Fix Before Production)

| # | Fix |
|---|---|
| M1 | Add field restriction to `user_update_own_notifications` WITH CHECK |
| M2 | Add WITH CHECK field lock to `dealer_update_own_pending_kyc` (block document_type change) |
| M3 | Split `staff_manage_inventory FOR ALL` into SELECT + INSERT + UPDATE only |
| M4 | Add `countries` and `exchange_rates` reference tables |
| M5 | Generalize `products.gst_rate` → `products.default_tax_rate` + `products.tax_rate_type` |
| M6 | Add `country_code` prefix to `generate_dealer_code()` |

---

## What Is Well-Designed ✅

- **FORCE RLS on all 16 tables** — correct, prevents accidental table-owner bypass
- **Append-only tables** (ledger, inventory_transactions, audit_logs) enforced at both RLS layer (no UPDATE/DELETE policy) and trigger layer — belt-and-suspenders is correct
- **Invoice↔order dealer consistency trigger** — prevents financial misattribution across dealers
- **Order status machine trigger** — prevents invalid transitions, has service-role bypass
- **`get_my_dealer_id()` / `get_my_role()` SECURITY DEFINER helpers** — correct pattern for RLS without recursion
- **`dealer_update_own_dealer` privileged field lock** — the concept is correct, the implementation (6 sub-selects) needs cleanup
- **`dealers.referred_by` immutability** — prevents referral fraud
- **Soft deletes** on users, dealers, orders — preserves audit trail
- **`NUMERIC(18,2)` precision** — correct for all target currencies
