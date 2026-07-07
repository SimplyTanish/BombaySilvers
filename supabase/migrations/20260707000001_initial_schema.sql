-- =============================================================================
-- Bombay Silvers Dealer Terminal — Initial Schema
-- Migration: 20260707000001_initial_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fuzzy search on names

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM (
  'super_admin',
  'admin',
  'staff',
  'dealer'
);

CREATE TYPE public.dealer_status AS ENUM (
  'pending_kyc',
  'under_review',
  'active',
  'suspended',
  'rejected'
);

CREATE TYPE public.dealer_tier AS ENUM (
  'bronze',
  'silver',
  'gold',
  'platinum'
);

CREATE TYPE public.business_type AS ENUM (
  'proprietorship',
  'partnership',
  'private_limited',
  'public_limited',
  'llp',
  'trust',
  'other'
);

CREATE TYPE public.metal_type AS ENUM (
  'gold',
  'silver',
  'platinum',
  'palladium'
);

CREATE TYPE public.metal_focus AS ENUM (
  'gold',
  'silver',
  'platinum',
  'mixed'
);

CREATE TYPE public.kyc_document_type AS ENUM (
  'pan_card',
  'gst_certificate',
  'business_registration',
  'address_proof',
  'bank_statement',
  'cancelled_cheque',
  'other'
);

CREATE TYPE public.kyc_status AS ENUM (
  'pending',
  'processing',
  'verified',
  'rejected'
);

CREATE TYPE public.product_unit AS ENUM (
  'gram',
  'kilogram',
  'troy_oz',
  'piece'
);

CREATE TYPE public.inventory_transaction_type AS ENUM (
  'purchase',       -- stock added to warehouse
  'sale',           -- stock removed on order delivery
  'reservation',    -- stock held for a pending order
  'release',        -- reservation released (order cancelled)
  'adjustment',     -- manual stock correction
  'transfer'        -- moved between warehouses
);

CREATE TYPE public.order_status AS ENUM (
  'draft',
  'pending',
  'confirmed',
  'dispatched',
  'in_transit',
  'delivered',
  'cancelled'
);

CREATE TYPE public.invoice_status AS ENUM (
  'draft',
  'issued',
  'paid',
  'overdue',
  'cancelled'
);

CREATE TYPE public.ledger_entry_type AS ENUM (
  'debit',
  'credit'
);

CREATE TYPE public.ledger_reference_type AS ENUM (
  'order',
  'invoice',
  'payment',
  'refund',
  'commission',
  'adjustment'
);

CREATE TYPE public.referral_status AS ENUM (
  'pending',    -- link clicked / invite sent
  'joined',     -- referred dealer registered
  'active',     -- referred dealer completed KYC and placed ≥1 order
  'rewarded'    -- commission disbursed to referrer
);

CREATE TYPE public.notification_type AS ENUM (
  'rate_alert',
  'order_update',
  'payment',
  'kyc',
  'referral',
  'system'
);

CREATE TYPE public.audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'otp_sent',
  'otp_verified',
  'rate_published',
  'kyc_reviewed',
  'session_revoked'
);


-- ---------------------------------------------------------------------------
-- HELPER: updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- TABLE: users
-- Extends auth.users with role and profile data.
-- One row per authenticated user (dealer, staff, admin, super admin).
-- ---------------------------------------------------------------------------
CREATE TABLE public.users (
  id            UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT          UNIQUE,
  phone         TEXT          UNIQUE,
  full_name     TEXT,
  avatar_url    TEXT,
  role          public.user_role NOT NULL DEFAULT 'dealer',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  last_sign_in  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ                             -- soft delete
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- TABLE: firms
-- Business/company registration details for a dealer.
-- Created during onboarding step 1.
-- ---------------------------------------------------------------------------
CREATE TABLE public.firms (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name              TEXT          NOT NULL,
  proprietor_name        TEXT          NOT NULL,
  business_type          public.business_type NOT NULL,
  years_in_business      SMALLINT      CHECK (years_in_business >= 0),
  primary_metal_focus    public.metal_focus NOT NULL DEFAULT 'mixed',
  monthly_turnover_range TEXT,                         -- e.g. "₹10L–₹50L"
  city                   TEXT          NOT NULL,
  state                  TEXT          NOT NULL,
  warehouse_address      TEXT,
  gstin                  TEXT          UNIQUE,
  pan_number             TEXT          UNIQUE,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_firms_updated_at
  BEFORE UPDATE ON public.firms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- TABLE: dealers
-- Dealer-specific profile linked to a user. Central hub row.
-- ---------------------------------------------------------------------------
CREATE TABLE public.dealers (
  id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID              NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  firm_id        UUID              REFERENCES public.firms(id) ON DELETE SET NULL,
  dealer_code    TEXT              NOT NULL UNIQUE,     -- e.g. "BS-MUM-00042"
  referral_code  TEXT              NOT NULL UNIQUE,     -- e.g. "BSREF-A1B2C3"
  referred_by    UUID              REFERENCES public.dealers(id) ON DELETE SET NULL,
  status         public.dealer_status NOT NULL DEFAULT 'pending_kyc',
  tier           public.dealer_tier   NOT NULL DEFAULT 'bronze',
  credit_limit   NUMERIC(18,2)     NOT NULL DEFAULT 0,
  current_balance NUMERIC(18,2)   NOT NULL DEFAULT 0,   -- negative = dealer owes
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ                             -- soft delete
);

CREATE TRIGGER trg_dealers_updated_at
  BEFORE UPDATE ON public.dealers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- TABLE: kyc_documents
-- Documents submitted by a dealer for KYC verification.
-- ---------------------------------------------------------------------------
CREATE TABLE public.kyc_documents (
  id               UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id        UUID                   NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  document_type    public.kyc_document_type NOT NULL,
  file_url         TEXT                   NOT NULL,    -- Supabase Storage URL
  file_name        TEXT,
  file_size_bytes  BIGINT,
  status           public.kyc_status      NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by      UUID                   REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ            NOT NULL DEFAULT NOW(),

  UNIQUE (dealer_id, document_type)       -- one doc of each type per dealer
);

CREATE TRIGGER trg_kyc_documents_updated_at
  BEFORE UPDATE ON public.kyc_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- TABLE: warehouses
-- Physical storage locations owned/used by Bombay Silvers.
-- ---------------------------------------------------------------------------
CREATE TABLE public.warehouses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  city       TEXT        NOT NULL,
  state      TEXT        NOT NULL,
  address    TEXT,
  pincode    TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_warehouses_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- TABLE: products
-- Master catalog of tradeable bullion products.
-- ---------------------------------------------------------------------------
CREATE TABLE public.products (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               TEXT              NOT NULL UNIQUE,
  name              TEXT              NOT NULL,
  metal_type        public.metal_type NOT NULL,
  purity            NUMERIC(5,2)      NOT NULL CHECK (purity > 0 AND purity <= 1000),
  -- purity stored as fineness (e.g. 999.9, 995, 916.6)
  unit_weight_grams NUMERIC(12,4)     NOT NULL CHECK (unit_weight_grams > 0),
  unit              public.product_unit NOT NULL DEFAULT 'gram',
  description       TEXT,
  image_url         TEXT,
  hsn_code          TEXT,             -- GST HSN code for bullion
  gst_rate          NUMERIC(5,4)      NOT NULL DEFAULT 0.03, -- 3% for bullion
  is_active         BOOLEAN           NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- TABLE: inventory
-- Current stock levels per product per warehouse.
-- ---------------------------------------------------------------------------
CREATE TABLE public.inventory (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID          NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  warehouse_id       UUID          NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  quantity_available NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_reserved  NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  rate_per_gram      NUMERIC(18,4) NOT NULL DEFAULT 0, -- current rate at time of last update
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (product_id, warehouse_id)
);

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- TABLE: inventory_transactions
-- Immutable audit trail of every stock movement. Never soft-delete.
-- ---------------------------------------------------------------------------
CREATE TABLE public.inventory_transactions (
  id               UUID                              PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id     UUID                              NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
  transaction_type public.inventory_transaction_type NOT NULL,
  quantity_delta   NUMERIC(18,4)                     NOT NULL,  -- positive = added, negative = removed
  quantity_after   NUMERIC(18,4)                     NOT NULL,  -- snapshot of available after
  rate_per_gram    NUMERIC(18,4),
  reason           TEXT,
  reference_type   TEXT,                             -- 'order', 'transfer', etc.
  reference_id     UUID,                             -- FK to orders.id etc. (polymorphic)
  performed_by     UUID                              REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ                       NOT NULL DEFAULT NOW()
  -- no updated_at: this table is append-only
);


-- ---------------------------------------------------------------------------
-- TABLE: orders
-- Purchase orders placed by dealers.
-- ---------------------------------------------------------------------------
CREATE TABLE public.orders (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT              NOT NULL UNIQUE,   -- e.g. "ORD-2026-004291"
  dealer_id         UUID              NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
  status            public.order_status NOT NULL DEFAULT 'pending',
  delivery_name     TEXT              NOT NULL,
  delivery_address  TEXT              NOT NULL,
  delivery_city     TEXT              NOT NULL,
  delivery_state    TEXT              NOT NULL,
  delivery_pincode  TEXT              NOT NULL,
  delivery_phone    TEXT,
  subtotal          NUMERIC(18,2)     NOT NULL DEFAULT 0,
  total_gst         NUMERIC(18,2)     NOT NULL DEFAULT 0,
  grand_total       NUMERIC(18,2)     NOT NULL DEFAULT 0,
  notes             TEXT,
  cancelled_reason  TEXT,
  dispatched_at     TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  created_by        UUID              REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ                         -- soft delete for cancelled
);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- TABLE: order_items
-- Line items within an order.
-- ---------------------------------------------------------------------------
CREATE TABLE public.order_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   UUID          NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  warehouse_id UUID          NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  quantity     NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(18,4) NOT NULL CHECK (unit_price >= 0),  -- per gram at order time
  gst_rate     NUMERIC(5,4)  NOT NULL DEFAULT 0.03,
  gst_amount   NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  -- no updated_at: order items are immutable once confirmed
);


-- ---------------------------------------------------------------------------
-- TABLE: invoices
-- GST-compliant invoices linked to orders.
-- ---------------------------------------------------------------------------
CREATE TABLE public.invoices (
  id             UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT                  NOT NULL UNIQUE,  -- e.g. "INV-2026-004291"
  order_id       UUID                  NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  dealer_id      UUID                  NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
  invoice_date   DATE                  NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE,
  subtotal       NUMERIC(18,2)         NOT NULL DEFAULT 0,
  cgst           NUMERIC(18,2)         NOT NULL DEFAULT 0,
  sgst           NUMERIC(18,2)         NOT NULL DEFAULT 0,
  igst           NUMERIC(18,2)         NOT NULL DEFAULT 0,
  total_gst      NUMERIC(18,2)         NOT NULL DEFAULT 0,
  grand_total    NUMERIC(18,2)         NOT NULL DEFAULT 0,
  status         public.invoice_status NOT NULL DEFAULT 'draft',
  pdf_url        TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- TABLE: ledger_entries
-- Double-entry-style financial ledger per dealer.
-- Every financial event creates one row. Never deleted.
-- ---------------------------------------------------------------------------
CREATE TABLE public.ledger_entries (
  id             UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id      UUID                        NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
  entry_type     public.ledger_entry_type    NOT NULL,
  amount         NUMERIC(18,2)               NOT NULL CHECK (amount > 0),
  balance_after  NUMERIC(18,2)               NOT NULL,  -- snapshot of dealer balance after this entry
  description    TEXT                        NOT NULL,
  reference_type public.ledger_reference_type,
  reference_id   UUID,                                  -- polymorphic: order/invoice/payment id
  created_by     UUID                        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
  -- no updated_at / deleted_at: immutable financial records
);


-- ---------------------------------------------------------------------------
-- TABLE: referrals
-- Referral relationships between dealers.
-- ---------------------------------------------------------------------------
CREATE TABLE public.referrals (
  id                  UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id         UUID                   NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
  referred_dealer_id  UUID                   REFERENCES public.dealers(id) ON DELETE SET NULL,
  -- referred_dealer_id is null until the referred person completes registration
  referred_name       TEXT                   NOT NULL,
  referred_phone      TEXT                   NOT NULL,
  status              public.referral_status NOT NULL DEFAULT 'pending',
  commission_rate     NUMERIC(5,4)           NOT NULL DEFAULT 0.001, -- 0.1% by default
  commission_amount   NUMERIC(18,2)          DEFAULT 0,
  commission_paid_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- TABLE: notifications
-- In-app notifications for users.
-- ---------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id         UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID                      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      TEXT                      NOT NULL,
  body       TEXT,
  type       public.notification_type  NOT NULL DEFAULT 'system',
  is_read    BOOLEAN                   NOT NULL DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  metadata   JSONB,                    -- e.g. { order_id: "...", rate: 9450 }
  created_at TIMESTAMPTZ               NOT NULL DEFAULT NOW()
  -- no updated_at: only is_read + read_at are mutable
);


-- ---------------------------------------------------------------------------
-- TABLE: sessions
-- Device/session registry for security management.
-- ---------------------------------------------------------------------------
CREATE TABLE public.sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_name  TEXT,                   -- e.g. "iPhone 15 Pro"
  device_type  TEXT,                   -- e.g. "mobile", "desktop", "tablet"
  ip_address   INET,
  user_agent   TEXT,
  is_trusted   BOOLEAN     NOT NULL DEFAULT FALSE,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,            -- set when user revokes; NULL = active
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- TABLE: audit_logs
-- Immutable system-wide audit trail. Append-only.
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID               REFERENCES public.users(id) ON DELETE SET NULL,
  action      public.audit_action NOT NULL,
  entity_type TEXT,              -- e.g. 'order', 'kyc_document', 'rate'
  entity_id   UUID,              -- ID of affected row
  old_values  JSONB,             -- snapshot before change
  new_values  JSONB,             -- snapshot after change
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB,             -- extra context (e.g. { dealer_count: 1284 })
  created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- INDEXES
-- =============================================================================

-- users
CREATE INDEX idx_users_role        ON public.users (role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone       ON public.users (phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email       ON public.users (email) WHERE deleted_at IS NULL;

-- dealers
CREATE INDEX idx_dealers_user_id   ON public.dealers (user_id);
CREATE INDEX idx_dealers_firm_id   ON public.dealers (firm_id);
CREATE INDEX idx_dealers_status    ON public.dealers (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_dealers_tier      ON public.dealers (tier);
CREATE INDEX idx_dealers_referred_by ON public.dealers (referred_by);
CREATE INDEX idx_dealers_referral_code ON public.dealers (referral_code);

-- kyc_documents
CREATE INDEX idx_kyc_dealer_id     ON public.kyc_documents (dealer_id);
CREATE INDEX idx_kyc_status        ON public.kyc_documents (status);

-- products
CREATE INDEX idx_products_sku      ON public.products (sku);
CREATE INDEX idx_products_metal    ON public.products (metal_type) WHERE is_active;
CREATE INDEX idx_products_name_trgm ON public.products USING GIN (name gin_trgm_ops);

-- inventory
CREATE INDEX idx_inventory_product    ON public.inventory (product_id);
CREATE INDEX idx_inventory_warehouse  ON public.inventory (warehouse_id);

-- inventory_transactions
CREATE INDEX idx_inv_txn_inventory   ON public.inventory_transactions (inventory_id);
CREATE INDEX idx_inv_txn_reference   ON public.inventory_transactions (reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX idx_inv_txn_created_at  ON public.inventory_transactions (created_at DESC);

-- orders
CREATE INDEX idx_orders_dealer_id    ON public.orders (dealer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status       ON public.orders (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_created_at   ON public.orders (created_at DESC);
CREATE INDEX idx_orders_number       ON public.orders (order_number);

-- order_items
CREATE INDEX idx_order_items_order      ON public.order_items (order_id);
CREATE INDEX idx_order_items_product    ON public.order_items (product_id);
CREATE INDEX idx_order_items_warehouse  ON public.order_items (warehouse_id);

-- invoices
CREATE INDEX idx_invoices_dealer_id    ON public.invoices (dealer_id);
CREATE INDEX idx_invoices_order_id     ON public.invoices (order_id);
CREATE INDEX idx_invoices_status       ON public.invoices (status);
CREATE INDEX idx_invoices_date         ON public.invoices (invoice_date DESC);

-- ledger_entries
CREATE INDEX idx_ledger_dealer_id      ON public.ledger_entries (dealer_id);
CREATE INDEX idx_ledger_created_at     ON public.ledger_entries (dealer_id, created_at DESC);
CREATE INDEX idx_ledger_reference      ON public.ledger_entries (reference_id) WHERE reference_id IS NOT NULL;

-- referrals
CREATE INDEX idx_referrals_referrer    ON public.referrals (referrer_id);
CREATE INDEX idx_referrals_referred    ON public.referrals (referred_dealer_id) WHERE referred_dealer_id IS NOT NULL;
CREATE INDEX idx_referrals_status      ON public.referrals (status);
CREATE INDEX idx_referrals_phone       ON public.referrals (referred_phone);

-- notifications
CREATE INDEX idx_notifications_user    ON public.notifications (user_id);
CREATE INDEX idx_notifications_unread  ON public.notifications (user_id) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type    ON public.notifications (type);
CREATE INDEX idx_notifications_created ON public.notifications (created_at DESC);

-- sessions
CREATE INDEX idx_sessions_user_id      ON public.sessions (user_id);
CREATE INDEX idx_sessions_active       ON public.sessions (user_id) WHERE revoked_at IS NULL;

-- audit_logs
CREATE INDEX idx_audit_user_id         ON public.audit_logs (user_id);
CREATE INDEX idx_audit_entity          ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_action          ON public.audit_logs (action);
CREATE INDEX idx_audit_created_at      ON public.audit_logs (created_at DESC);


-- =============================================================================
-- SEQUENCE HELPERS (for human-readable IDs)
-- =============================================================================

CREATE SEQUENCE public.order_number_seq START 1000;
CREATE SEQUENCE public.invoice_number_seq START 1000;
CREATE SEQUENCE public.dealer_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
  SELECT 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('public.order_number_seq')::TEXT, 6, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
  SELECT 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.generate_dealer_code(city TEXT)
RETURNS TEXT AS $$
  SELECT 'BS-' || UPPER(LEFT(city, 3)) || '-' || LPAD(nextval('public.dealer_code_seq')::TEXT, 5, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
  SELECT 'BSREF-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));
$$ LANGUAGE sql;


-- =============================================================================
-- AUTO-CREATE user row when auth.users is created (via Supabase trigger)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
