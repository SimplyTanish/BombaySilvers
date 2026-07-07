/**
 * Supabase database type definitions for Bombay Silvers Dealer Terminal.
 *
 * Generated from the schema defined in:
 *   supabase/migrations/20260707000001_initial_schema.sql
 *
 * To regenerate after schema changes:
 *   npx supabase gen types typescript --project-id <your-project-ref> > src/lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export type UserRole = "super_admin" | "admin" | "staff" | "dealer";
export type DealerStatus =
  | "pending_kyc"
  | "under_review"
  | "active"
  | "suspended"
  | "rejected";
export type DealerTier = "bronze" | "silver" | "gold" | "platinum";
export type BusinessType =
  | "proprietorship"
  | "partnership"
  | "private_limited"
  | "public_limited"
  | "llp"
  | "trust"
  | "other";
export type MetalType = "gold" | "silver" | "platinum" | "palladium";
export type MetalFocus = "gold" | "silver" | "platinum" | "mixed";
export type KycDocumentType =
  | "pan_card"
  | "gst_certificate"
  | "business_registration"
  | "address_proof"
  | "bank_statement"
  | "cancelled_cheque"
  | "other";
export type KycStatus = "pending" | "processing" | "verified" | "rejected";
export type ProductUnit = "gram" | "kilogram" | "troy_oz" | "piece";
export type InventoryTransactionType =
  | "purchase"
  | "sale"
  | "reservation"
  | "release"
  | "adjustment"
  | "transfer";
export type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "dispatched"
  | "in_transit"
  | "delivered"
  | "cancelled";
export type InvoiceStatus =
  | "draft"
  | "issued"
  | "paid"
  | "overdue"
  | "cancelled";
export type LedgerEntryType = "debit" | "credit";
export type LedgerReferenceType =
  | "order"
  | "invoice"
  | "payment"
  | "refund"
  | "commission"
  | "adjustment";
export type ReferralStatus = "pending" | "joined" | "active" | "rewarded";
export type NotificationType =
  | "rate_alert"
  | "order_update"
  | "payment"
  | "kyc"
  | "referral"
  | "system";
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "otp_sent"
  | "otp_verified"
  | "rate_published"
  | "kyc_reviewed"
  | "session_revoked";

// ---------------------------------------------------------------------------
// Row types (shape of a row returned from the DB)
// ---------------------------------------------------------------------------
export interface UserRow {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  last_sign_in: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FirmRow {
  id: string;
  firm_name: string;
  proprietor_name: string;
  business_type: BusinessType;
  years_in_business: number | null;
  primary_metal_focus: MetalFocus;
  monthly_turnover_range: string | null;
  city: string;
  state: string;
  warehouse_address: string | null;
  gstin: string | null;
  pan_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealerRow {
  id: string;
  user_id: string;
  firm_id: string | null;
  dealer_code: string;
  referral_code: string;
  referred_by: string | null;
  status: DealerStatus;
  tier: DealerTier;
  credit_limit: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface KycDocumentRow {
  id: string;
  dealer_id: string;
  document_type: KycDocumentType;
  file_url: string;
  file_name: string | null;
  file_size_bytes: number | null;
  status: KycStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarehouseRow {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string | null;
  pincode: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  metal_type: MetalType;
  purity: number;
  unit_weight_grams: number;
  unit: ProductUnit;
  description: string | null;
  image_url: string | null;
  hsn_code: string | null;
  gst_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryRow {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity_available: number;
  quantity_reserved: number;
  rate_per_gram: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransactionRow {
  id: string;
  inventory_id: string;
  transaction_type: InventoryTransactionType;
  quantity_delta: number;
  quantity_after: number;
  rate_per_gram: number | null;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  dealer_id: string;
  status: OrderStatus;
  delivery_name: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  delivery_pincode: string;
  delivery_phone: string | null;
  subtotal: number;
  total_gst: number;
  grand_total: number;
  notes: string | null;
  cancelled_reason: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  created_at: string;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  order_id: string;
  dealer_id: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_gst: number;
  grand_total: number;
  status: InvoiceStatus;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntryRow {
  id: string;
  dealer_id: string;
  entry_type: LedgerEntryType;
  amount: number;
  balance_after: number;
  description: string;
  reference_type: LedgerReferenceType | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_dealer_id: string | null;
  referred_name: string;
  referred_phone: string;
  status: ReferralStatus;
  commission_rate: number;
  commission_amount: number | null;
  commission_paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: NotificationType;
  is_read: boolean;
  read_at: string | null;
  metadata: Json | null;
  created_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  device_name: string | null;
  device_type: string | null;
  ip_address: string | null;
  user_agent: string | null;
  is_trusted: boolean;
  last_active_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Json | null;
  new_values: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Json | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Database interface (for createClient<Database>)
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<UserRow>;
      };
      firms: {
        Row: FirmRow;
        Insert: Omit<FirmRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<FirmRow>;
      };
      dealers: {
        Row: DealerRow;
        Insert: Omit<DealerRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<DealerRow>;
      };
      kyc_documents: {
        Row: KycDocumentRow;
        Insert: Omit<KycDocumentRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<KycDocumentRow>;
      };
      warehouses: {
        Row: WarehouseRow;
        Insert: Omit<WarehouseRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<WarehouseRow>;
      };
      products: {
        Row: ProductRow;
        Insert: Omit<ProductRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ProductRow>;
      };
      inventory: {
        Row: InventoryRow;
        Insert: Omit<InventoryRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<InventoryRow>;
      };
      inventory_transactions: {
        Row: InventoryTransactionRow;
        Insert: Omit<InventoryTransactionRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: never; // append-only
      };
      orders: {
        Row: OrderRow;
        Insert: Omit<OrderRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<OrderRow>;
      };
      order_items: {
        Row: OrderItemRow;
        Insert: Omit<OrderItemRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: never; // immutable post-confirm
      };
      invoices: {
        Row: InvoiceRow;
        Insert: Omit<InvoiceRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<InvoiceRow>;
      };
      ledger_entries: {
        Row: LedgerEntryRow;
        Insert: Omit<LedgerEntryRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: never; // append-only
      };
      referrals: {
        Row: ReferralRow;
        Insert: Omit<ReferralRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ReferralRow>;
      };
      notifications: {
        Row: NotificationRow;
        Insert: Omit<NotificationRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Pick<NotificationRow, "is_read" | "read_at">;
      };
      sessions: {
        Row: SessionRow;
        Insert: Omit<SessionRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<SessionRow>;
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Omit<AuditLogRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: never; // append-only
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_my_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      get_my_dealer_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_admin_or_above: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_staff_or_above: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      generate_order_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_invoice_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_dealer_code: {
        Args: { city: string };
        Returns: string;
      };
      generate_referral_code: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      dealer_status: DealerStatus;
      dealer_tier: DealerTier;
      business_type: BusinessType;
      metal_type: MetalType;
      metal_focus: MetalFocus;
      kyc_document_type: KycDocumentType;
      kyc_status: KycStatus;
      product_unit: ProductUnit;
      inventory_transaction_type: InventoryTransactionType;
      order_status: OrderStatus;
      invoice_status: InvoiceStatus;
      ledger_entry_type: LedgerEntryType;
      ledger_reference_type: LedgerReferenceType;
      referral_status: ReferralStatus;
      notification_type: NotificationType;
      audit_action: AuditAction;
    };
  };
}
