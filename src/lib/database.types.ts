export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"];
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          ip_address: unknown;
          metadata: Json | null;
          new_values: Json | null;
          old_values: Json | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          action: Database["public"]["Enums"]["audit_action"];
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          new_values?: Json | null;
          old_values?: Json | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: Database["public"]["Enums"]["audit_action"];
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          new_values?: Json | null;
          old_values?: Json | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      dealers: {
        Row: {
          created_at: string;
          credit_limit: number;
          current_balance: number;
          dealer_code: string;
          deleted_at: string | null;
          firm_id: string | null;
          id: string;
          referral_code: string;
          referred_by: string | null;
          status: Database["public"]["Enums"]["dealer_status"];
          tier: Database["public"]["Enums"]["dealer_tier"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          credit_limit?: number;
          current_balance?: number;
          dealer_code: string;
          deleted_at?: string | null;
          firm_id?: string | null;
          id?: string;
          referral_code: string;
          referred_by?: string | null;
          status?: Database["public"]["Enums"]["dealer_status"];
          tier?: Database["public"]["Enums"]["dealer_tier"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          credit_limit?: number;
          current_balance?: number;
          dealer_code?: string;
          deleted_at?: string | null;
          firm_id?: string | null;
          id?: string;
          referral_code?: string;
          referred_by?: string | null;
          status?: Database["public"]["Enums"]["dealer_status"];
          tier?: Database["public"]["Enums"]["dealer_tier"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dealers_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dealers_referred_by_fkey";
            columns: ["referred_by"];
            isOneToOne: false;
            referencedRelation: "dealers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dealers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      firms: {
        Row: {
          business_type: Database["public"]["Enums"]["business_type"];
          city: string;
          created_at: string;
          firm_name: string;
          gstin: string | null;
          id: string;
          monthly_turnover_range: string | null;
          pan_number: string | null;
          primary_metal_focus: Database["public"]["Enums"]["metal_focus"];
          proprietor_name: string;
          state: string;
          updated_at: string;
          warehouse_address: string | null;
          years_in_business: number | null;
        };
        Insert: {
          business_type: Database["public"]["Enums"]["business_type"];
          city: string;
          created_at?: string;
          firm_name: string;
          gstin?: string | null;
          id?: string;
          monthly_turnover_range?: string | null;
          pan_number?: string | null;
          primary_metal_focus?: Database["public"]["Enums"]["metal_focus"];
          proprietor_name: string;
          state: string;
          updated_at?: string;
          warehouse_address?: string | null;
          years_in_business?: number | null;
        };
        Update: {
          business_type?: Database["public"]["Enums"]["business_type"];
          city?: string;
          created_at?: string;
          firm_name?: string;
          gstin?: string | null;
          id?: string;
          monthly_turnover_range?: string | null;
          pan_number?: string | null;
          primary_metal_focus?: Database["public"]["Enums"]["metal_focus"];
          proprietor_name?: string;
          state?: string;
          updated_at?: string;
          warehouse_address?: string | null;
          years_in_business?: number | null;
        };
        Relationships: [];
      };
      inventory: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          quantity_available: number;
          quantity_reserved: number;
          rate_per_gram: number;
          updated_at: string;
          warehouse_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          quantity_available?: number;
          quantity_reserved?: number;
          rate_per_gram?: number;
          updated_at?: string;
          warehouse_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          quantity_available?: number;
          quantity_reserved?: number;
          rate_per_gram?: number;
          updated_at?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_transactions: {
        Row: {
          created_at: string;
          id: string;
          inventory_id: string;
          performed_by: string | null;
          quantity_after: number;
          quantity_delta: number;
          rate_per_gram: number | null;
          reason: string | null;
          reference_id: string | null;
          reference_type: string | null;
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          inventory_id: string;
          performed_by?: string | null;
          quantity_after: number;
          quantity_delta: number;
          rate_per_gram?: number | null;
          reason?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"];
        };
        Update: {
          created_at?: string;
          id?: string;
          inventory_id?: string;
          performed_by?: string | null;
          quantity_after?: number;
          quantity_delta?: number;
          rate_per_gram?: number | null;
          reason?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          transaction_type?: Database["public"]["Enums"]["inventory_transaction_type"];
        };
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "inventory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_transactions_performed_by_fkey";
            columns: ["performed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          cgst: number;
          created_at: string;
          dealer_id: string;
          due_date: string | null;
          grand_total: number;
          id: string;
          igst: number;
          invoice_date: string;
          invoice_number: string;
          notes: string | null;
          order_id: string;
          pdf_url: string | null;
          sgst: number;
          status: Database["public"]["Enums"]["invoice_status"];
          subtotal: number;
          total_gst: number;
          updated_at: string;
        };
        Insert: {
          cgst?: number;
          created_at?: string;
          dealer_id: string;
          due_date?: string | null;
          grand_total?: number;
          id?: string;
          igst?: number;
          invoice_date?: string;
          invoice_number: string;
          notes?: string | null;
          order_id: string;
          pdf_url?: string | null;
          sgst?: number;
          status?: Database["public"]["Enums"]["invoice_status"];
          subtotal?: number;
          total_gst?: number;
          updated_at?: string;
        };
        Update: {
          cgst?: number;
          created_at?: string;
          dealer_id?: string;
          due_date?: string | null;
          grand_total?: number;
          id?: string;
          igst?: number;
          invoice_date?: string;
          invoice_number?: string;
          notes?: string | null;
          order_id?: string;
          pdf_url?: string | null;
          sgst?: number;
          status?: Database["public"]["Enums"]["invoice_status"];
          subtotal?: number;
          total_gst?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_dealer_id_fkey";
            columns: ["dealer_id"];
            isOneToOne: false;
            referencedRelation: "dealers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      kyc_documents: {
        Row: {
          created_at: string;
          dealer_id: string;
          document_type: Database["public"]["Enums"]["kyc_document_type"];
          file_name: string | null;
          file_size_bytes: number | null;
          file_url: string;
          id: string;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["kyc_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          dealer_id: string;
          document_type: Database["public"]["Enums"]["kyc_document_type"];
          file_name?: string | null;
          file_size_bytes?: number | null;
          file_url: string;
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["kyc_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          dealer_id?: string;
          document_type?: Database["public"]["Enums"]["kyc_document_type"];
          file_name?: string | null;
          file_size_bytes?: number | null;
          file_url?: string;
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["kyc_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kyc_documents_dealer_id_fkey";
            columns: ["dealer_id"];
            isOneToOne: false;
            referencedRelation: "dealers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kyc_documents_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ledger_entries: {
        Row: {
          amount: number;
          balance_after: number;
          created_at: string;
          created_by: string | null;
          dealer_id: string;
          description: string;
          entry_type: Database["public"]["Enums"]["ledger_entry_type"];
          id: string;
          reference_id: string | null;
          reference_type: Database["public"]["Enums"]["ledger_reference_type"] | null;
        };
        Insert: {
          amount: number;
          balance_after: number;
          created_at?: string;
          created_by?: string | null;
          dealer_id: string;
          description: string;
          entry_type: Database["public"]["Enums"]["ledger_entry_type"];
          id?: string;
          reference_id?: string | null;
          reference_type?: Database["public"]["Enums"]["ledger_reference_type"] | null;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          created_at?: string;
          created_by?: string | null;
          dealer_id?: string;
          description?: string;
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"];
          id?: string;
          reference_id?: string | null;
          reference_type?: Database["public"]["Enums"]["ledger_reference_type"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_entries_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_entries_dealer_id_fkey";
            columns: ["dealer_id"];
            isOneToOne: false;
            referencedRelation: "dealers";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          is_read: boolean;
          metadata: Json | null;
          read_at: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          metadata?: Json | null;
          read_at?: string | null;
          title: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          metadata?: Json | null;
          read_at?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_alerts: {
        Row: {
          above_price: number | null;
          below_price: number | null;
          created_at: string;
          id: string;
          is_active: boolean;
          metal_type: Database["public"]["Enums"]["metal_type"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          above_price?: number | null;
          below_price?: number | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          metal_type: Database["public"]["Enums"]["metal_type"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          above_price?: number | null;
          below_price?: number | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          metal_type?: Database["public"]["Enums"]["metal_type"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rate_alerts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          gst_amount: number;
          gst_rate: number;
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          total_amount: number;
          unit_price: number;
          warehouse_id: string;
        };
        Insert: {
          created_at?: string;
          gst_amount?: number;
          gst_rate?: number;
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          total_amount?: number;
          unit_price: number;
          warehouse_id: string;
        };
        Update: {
          created_at?: string;
          gst_amount?: number;
          gst_rate?: number;
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          total_amount?: number;
          unit_price?: number;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          cancelled_reason: string | null;
          created_at: string;
          created_by: string | null;
          dealer_id: string;
          deleted_at: string | null;
          delivered_at: string | null;
          delivery_address: string;
          delivery_city: string;
          delivery_name: string;
          delivery_phone: string | null;
          delivery_pincode: string;
          delivery_state: string;
          dispatched_at: string | null;
          grand_total: number;
          id: string;
          notes: string | null;
          order_number: string;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total_gst: number;
          updated_at: string;
        };
        Insert: {
          cancelled_reason?: string | null;
          created_at?: string;
          created_by?: string | null;
          dealer_id: string;
          deleted_at?: string | null;
          delivered_at?: string | null;
          delivery_address: string;
          delivery_city: string;
          delivery_name: string;
          delivery_phone?: string | null;
          delivery_pincode: string;
          delivery_state: string;
          dispatched_at?: string | null;
          grand_total?: number;
          id?: string;
          notes?: string | null;
          order_number: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total_gst?: number;
          updated_at?: string;
        };
        Update: {
          cancelled_reason?: string | null;
          created_at?: string;
          created_by?: string | null;
          dealer_id?: string;
          deleted_at?: string | null;
          delivered_at?: string | null;
          delivery_address?: string;
          delivery_city?: string;
          delivery_name?: string;
          delivery_phone?: string | null;
          delivery_pincode?: string;
          delivery_state?: string;
          dispatched_at?: string | null;
          grand_total?: number;
          id?: string;
          notes?: string | null;
          order_number?: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total_gst?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_dealer_id_fkey";
            columns: ["dealer_id"];
            isOneToOne: false;
            referencedRelation: "dealers";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          created_at: string;
          description: string | null;
          gst_rate: number;
          hsn_code: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          metal_type: Database["public"]["Enums"]["metal_type"];
          name: string;
          purity: number;
          sku: string;
          unit: Database["public"]["Enums"]["product_unit"];
          unit_weight_grams: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          gst_rate?: number;
          hsn_code?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          metal_type: Database["public"]["Enums"]["metal_type"];
          name: string;
          purity: number;
          sku: string;
          unit?: Database["public"]["Enums"]["product_unit"];
          unit_weight_grams: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          gst_rate?: number;
          hsn_code?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          metal_type?: Database["public"]["Enums"]["metal_type"];
          name?: string;
          purity?: number;
          sku?: string;
          unit?: Database["public"]["Enums"]["product_unit"];
          unit_weight_grams?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      published_rates: {
        Row: {
          buy_rate: number;
          currency_code: string;
          id: string;
          label: string;
          metal: Database["public"]["Enums"]["metal_type"];
          published_at: string;
          published_by: string | null;
          purity: number;
          sell_rate: number;
          unit: string;
        };
        Insert: {
          buy_rate: number;
          currency_code?: string;
          id?: string;
          label: string;
          metal: Database["public"]["Enums"]["metal_type"];
          published_at?: string;
          published_by?: string | null;
          purity?: number;
          sell_rate: number;
          unit?: string;
        };
        Update: {
          buy_rate?: number;
          currency_code?: string;
          id?: string;
          label?: string;
          metal?: Database["public"]["Enums"]["metal_type"];
          published_at?: string;
          published_by?: string | null;
          purity?: number;
          sell_rate?: number;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "published_rates_currency_code_fkey";
            columns: ["currency_code"];
            isOneToOne: false;
            referencedRelation: "currencies";
            referencedColumns: ["code"];
          },
        ];
      };
      referrals: {
        Row: {
          commission_amount: number | null;
          commission_paid_at: string | null;
          commission_rate: number;
          created_at: string;
          id: string;
          referred_dealer_id: string | null;
          referred_name: string;
          referred_phone: string;
          referrer_id: string;
          status: Database["public"]["Enums"]["referral_status"];
          updated_at: string;
        };
        Insert: {
          commission_amount?: number | null;
          commission_paid_at?: string | null;
          commission_rate?: number;
          created_at?: string;
          id?: string;
          referred_dealer_id?: string | null;
          referred_name: string;
          referred_phone: string;
          referrer_id: string;
          status?: Database["public"]["Enums"]["referral_status"];
          updated_at?: string;
        };
        Update: {
          commission_amount?: number | null;
          commission_paid_at?: string | null;
          commission_rate?: number;
          created_at?: string;
          id?: string;
          referred_dealer_id?: string | null;
          referred_name?: string;
          referred_phone?: string;
          referrer_id?: string;
          status?: Database["public"]["Enums"]["referral_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referrals_referred_dealer_id_fkey";
            columns: ["referred_dealer_id"];
            isOneToOne: false;
            referencedRelation: "dealers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey";
            columns: ["referrer_id"];
            isOneToOne: false;
            referencedRelation: "dealers";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          created_at: string;
          device_name: string | null;
          device_type: string | null;
          expires_at: string | null;
          id: string;
          ip_address: unknown;
          is_trusted: boolean;
          last_active_at: string;
          revoked_at: string | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_name?: string | null;
          device_type?: string | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: unknown;
          is_trusted?: boolean;
          last_active_at?: string;
          revoked_at?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_name?: string | null;
          device_type?: string | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: unknown;
          is_trusted?: boolean;
          last_active_at?: string;
          revoked_at?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          is_active: boolean;
          last_sign_in: string | null;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          last_sign_in?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          last_sign_in?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      warehouses: {
        Row: {
          address: string | null;
          city: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          pincode: string | null;
          state: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          city: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          pincode?: string | null;
          state: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          pincode?: string | null;
          state?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      latest_rates: {
        Row: {
          buy_rate: number;
          currency_code: string;
          label: string;
          metal: Database["public"]["Enums"]["metal_type"];
          published_at: string;
          purity: number;
          sell_rate: number;
          unit: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      generate_dealer_code: { Args: { city: string }; Returns: string };
      generate_dealer_invoice: {
        Args: { p_order_id: string };
        Returns: { invoice_id: string; invoice_number: string }[];
      };
      generate_invoice_number: { Args: never; Returns: string };
      generate_order_number: { Args: never; Returns: string };
      generate_referral_code: { Args: never; Returns: string };
      get_my_dealer_id: { Args: never; Returns: string };
      get_my_dealer_snapshot: {
        Args: never;
        Returns: {
          created_at: string;
          credit_limit: number;
          current_balance: number;
          dealer_code: string;
          deleted_at: string | null;
          firm_id: string | null;
          id: string;
          referral_code: string;
          referred_by: string | null;
          status: Database["public"]["Enums"]["dealer_status"];
          tier: Database["public"]["Enums"]["dealer_tier"];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "dealers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_my_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      get_user_role: {
        Args: { target_id: string };
        Returns: Database["public"]["Enums"]["user_role"];
      };
      is_admin_or_above: { Args: never; Returns: boolean };
      is_dealer: { Args: never; Returns: boolean };
      is_staff_or_above: { Args: never; Returns: boolean };
      is_super_admin: { Args: never; Returns: boolean };
      reserve_inventory: {
        Args: { p_inventory_id: string; p_quantity: number; p_remarks?: string | null };
        Returns: undefined;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
    };
    Enums: {
      audit_action:
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
      business_type:
        | "proprietorship"
        | "partnership"
        | "private_limited"
        | "public_limited"
        | "llp"
        | "trust"
        | "other";
      dealer_status: "pending_kyc" | "under_review" | "active" | "suspended" | "rejected";
      dealer_tier: "bronze" | "silver" | "gold" | "platinum";
      inventory_transaction_type:
        "purchase" | "sale" | "reservation" | "release" | "adjustment" | "transfer";
      invoice_status: "draft" | "issued" | "paid" | "overdue" | "cancelled";
      kyc_document_type:
        | "pan_card"
        | "gst_certificate"
        | "business_registration"
        | "address_proof"
        | "bank_statement"
        | "cancelled_cheque"
        | "other";
      kyc_status: "pending" | "processing" | "verified" | "rejected";
      ledger_entry_type: "debit" | "credit";
      ledger_reference_type:
        "order" | "invoice" | "payment" | "refund" | "commission" | "adjustment";
      metal_focus: "gold" | "silver" | "platinum" | "mixed";
      metal_type: "gold" | "silver" | "platinum" | "palladium";
      notification_type: "rate_alert" | "order_update" | "payment" | "kyc" | "referral" | "system";
      order_status:
        "draft" | "pending" | "confirmed" | "dispatched" | "in_transit" | "delivered" | "cancelled";
      product_unit: "gram" | "kilogram" | "troy_oz" | "piece";
      referral_status: "pending" | "joined" | "active" | "rewarded";
      user_role: "super_admin" | "admin" | "staff" | "dealer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          metadata: Json | null;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: false;
            referencedRelation: "s3_multipart_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets_vectors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] };
        Returns: boolean;
      };
      allow_only_operation: {
        Args: { expected_operation: string };
        Returns: boolean;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string };
        Returns: string;
      };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_by_timestamp: {
        Args: {
          p_bucket_id: string;
          p_level: number;
          p_limit: number;
          p_prefix: string;
          p_sort_column: string;
          p_sort_column_after: string;
          p_sort_order: string;
          p_start_after: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      audit_action: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "otp_sent",
        "otp_verified",
        "rate_published",
        "kyc_reviewed",
        "session_revoked",
      ],
      business_type: [
        "proprietorship",
        "partnership",
        "private_limited",
        "public_limited",
        "llp",
        "trust",
        "other",
      ],
      dealer_status: ["pending_kyc", "under_review", "active", "suspended", "rejected"],
      dealer_tier: ["bronze", "silver", "gold", "platinum"],
      inventory_transaction_type: [
        "purchase",
        "sale",
        "reservation",
        "release",
        "adjustment",
        "transfer",
      ],
      invoice_status: ["draft", "issued", "paid", "overdue", "cancelled"],
      kyc_document_type: [
        "pan_card",
        "gst_certificate",
        "business_registration",
        "address_proof",
        "bank_statement",
        "cancelled_cheque",
        "other",
      ],
      kyc_status: ["pending", "processing", "verified", "rejected"],
      ledger_entry_type: ["debit", "credit"],
      ledger_reference_type: ["order", "invoice", "payment", "refund", "commission", "adjustment"],
      metal_focus: ["gold", "silver", "platinum", "mixed"],
      metal_type: ["gold", "silver", "platinum", "palladium"],
      notification_type: ["rate_alert", "order_update", "payment", "kyc", "referral", "system"],
      order_status: [
        "draft",
        "pending",
        "confirmed",
        "dispatched",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      product_unit: ["gram", "kilogram", "troy_oz", "piece"],
      referral_status: ["pending", "joined", "active", "rewarded"],
      user_role: ["super_admin", "admin", "staff", "dealer"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const;
