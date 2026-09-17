import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Invoice = {
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
  status: "draft" | "issued" | "paid" | "void";
  pdf_url: string | null;
  created_at: string;
  orders?: {
    order_number: string;
    status: string;
  } | null;
};

export const invoiceKeys = {
  all: ["invoices"] as const,
  list: ["invoices", "list"] as const,
  detail: (id: string) => ["invoices", "detail", id] as const,
};

/**
 * List invoices visible to the current user. RLS scopes dealers to their own
 * invoice rows — no dealer_id is passed from the client.
 */
export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, order_id, dealer_id, invoice_date, due_date, subtotal, cgst, sgst, igst, total_gst, grand_total, status, pdf_url, created_at, orders(order_number, status)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[invoices] failed to load:", error.message);
    throw error;
  }

  return (data ?? []) as unknown as Invoice[];
}

export function useInvoices() {
  return useQuery<Invoice[], Error>({
    queryKey: invoiceKeys.list,
    queryFn: fetchInvoices,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

/**
 * Resolve a signed/expiring storage URL for an invoice PDF.
 * If the invoice has no pdf_url yet, returns null (caller can fall back to
 * client-side PDF generation).
 */
export async function getInvoicePdfUrl(invoice: Invoice): Promise<string | null> {
  if (!invoice.pdf_url) return null;

  const path = invoice.pdf_url.startsWith("invoices/")
    ? invoice.pdf_url
    : invoice.pdf_url.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\//, "");

  const { data } = await supabase.storage.from("invoices").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}