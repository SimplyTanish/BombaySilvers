import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createAdminClient } from "@/lib/supabase";
import { renderInvoicePdfBytes, type InvoicePdfData } from "@/lib/invoice-pdf";

/**
 * Server-side invoice PDF generation.
 *
 * Responsibilities:
 *   - Load the full invoice context (order, items, dealer, firm) via the
 *     service-role client (bypasses RLS; used only on the server).
 *   - Render the same branded PDF that the client fallback uses.
 *   - Upload to the PRIVATE `invoices` bucket under an unguessable path:
 *         invoices/<dealer_id>/<invoice_id>.pdf
 *   - Persist the path on invoices.pdf_url, then return a signed URL the
 *     dealer can fetch for 1 hour.
 *
 * Only the invoice owner (dealer) may request their own PDF; staff+ may
 * request any. Enforced here by comparing get_my_dealer_id() to the invoice.
 */
export const generateInvoicePdf = createServerFn({ method: "POST" })
  .validator((raw: unknown) => {
    const d = raw as { invoiceId?: string };
    if (typeof d?.invoiceId !== "string" || !d.invoiceId.trim()) {
      throw new Error("Invoice id is required");
    }
    return { invoiceId: d.invoiceId.trim() };
  })
  .handler(async ({ data }) => {
    const admin = createAdminClient();

    const { data: invoice, error: invoiceError } = await admin
      .from("invoices")
      .select(
        `*,
         orders(order_number, status, created_at, notes),
         dealers(firm_id, dealer_code, firm:firms(*))`,
      )
      .eq("id", data.invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    // Authorization: dealer may fetch only their own invoice; staff+ any.
    // The browser forwards the caller's Supabase JWT as the Authorization
    // header; read it from the incoming request so the service-role client can
    // validate who is calling (we never persist the caller's session here).
    const authHeader = getRequestHeader("authorization");
    const callerToken = authHeader?.replace(/^Bearer\s+/i, "") ?? null;
    if (!callerToken) {
      throw new Error("Unauthenticated");
    }
    const { data: userData, error: userError } = await admin.auth.getUser(callerToken);
    const callerId = userData.user?.id;
    if (userError || !callerId) {
      throw new Error("Unauthenticated");
    }
    const { data: callerDealer } = await admin
      .from("dealers")
      .select("id, role:users!inner(role)")
      .eq("user_id", callerId)
      .maybeSingle();
    const dealerId = (callerDealer as { id?: string; role?: { role?: string } } | null)?.id;

    type InvoiceRow = {
      id: string;
      invoice_number: string;
      invoice_date: string;
      dealer_id: string;
      order_id: string;
      subtotal: number;
      total_gst: number;
      grand_total: number;
      orders: { order_number: string } | null;
      dealers: {
        firm_id: string | null;
        firm: {
          firm_name: string;
          gstin?: string | null;
          pan_number?: string | null;
          warehouse_address?: string | null;
          city?: string | null;
          state?: string | null;
        } | null;
      } | null;
    };
    const inv = invoice as unknown as InvoiceRow;
    const firm = inv.dealers?.firm ?? null;

    const isStaff =
      (callerDealer as { role?: { role?: string } } | null)?.role?.role &&
      ["admin", "super_admin", "staff"].includes(
        (callerDealer as { role?: { role?: string } } | null)?.role?.role ?? "",
      );

    if (!isStaff && inv.dealer_id !== dealerId) {
      throw new Error("You may only download your own invoice");
    }

    // Order items for line items.
    const { data: items } = await admin
      .from("order_items")
      .select("quantity, unit_price, products(name, unit)")
      .eq("order_id", inv.order_id);

    const rows = (items ?? []) as unknown as Array<{
      quantity: number;
      unit_price: number;
      products: { name: string; unit: string } | null;
    }>;

    const pdfData: InvoicePdfData = {
      invoiceNumber: inv.invoice_number,
      invoiceDate: new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(inv.invoice_date)),
      orderNumber: inv.orders?.order_number ?? "—",
      dealer: {
        name: firm?.firm_name ?? "Bombay Silvers Dealer",
        gstin: firm?.gstin ?? null,
        pan: firm?.pan_number ?? null,
        address: firm?.warehouse_address ?? null,
        city: firm?.city ?? null,
        state: firm?.state ?? null,
      },
      items: rows.map((r) => ({
        name: r.products?.name ?? "Bullion",
        quantity: r.quantity,
        unitPrice: r.unit_price,
        total: r.quantity * r.unit_price,
      })),
      subtotal: inv.subtotal,
      gst: inv.total_gst,
      total: inv.grand_total,
    };

    const bytes = await renderInvoicePdfBytes(pdfData);
    const filePath = `invoices/${inv.dealer_id}/${inv.id}.pdf`;

    const { error: uploadError } = await admin.storage
      .from("invoices")
      .upload(filePath, new Blob([bytes as BlobPart], { type: "application/pdf" }), {
        upsert: true,
        contentType: "application/pdf",
      });
    if (uploadError) {
      throw new Error(`Failed to store PDF: ${uploadError.message}`);
    }

    const { error: updateError } = await admin
      .from("invoices")
      .update({ pdf_url: filePath })
      .eq("id", inv.id);
    if (updateError) {
      throw new Error(`Failed to save invoice PDF path: ${updateError.message}`);
    }

    const { data: signed } = await admin.storage.from("invoices").createSignedUrl(filePath, 3600);

    return {
      pdfUrl: signed?.signedUrl ?? null,
      path: filePath,
    };
  });
