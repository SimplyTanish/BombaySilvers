import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { Download, FileText, Loader2, Search } from "lucide-react";
import { KycGate } from "@/components/KycGate";
import { useInvoices, getInvoicePdfUrl, type Invoice } from "@/hooks/use-invoices";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { generateInvoicePdf } from "@/lib/invoice-gen";
import { fmtINR } from "@/lib/rates";
import { toast } from "sonner";

export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "Invoices · Bombay Silvers" }] }),
  component: Invoices,
});

const statusTone: Record<Invoice["status"], string> = {
  paid: "bg-[var(--gain)]/10 text-[var(--gain)]",
  issued: "bg-[var(--warn)]/10 text-[var(--warn)]",
  draft: "bg-[var(--surface-3)] text-muted-foreground",
  void: "bg-[var(--loss)]/10 text-[var(--loss)]",
};

function Invoices() {
  const { data: invoices, isLoading, isError, refetch } = useInvoices();
  const [query, setQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices ?? [];
    return (invoices ?? []).filter(
      (i) =>
        i.invoice_number.toLowerCase().includes(q) ||
        (i.orders?.order_number ?? "").toLowerCase().includes(q),
    );
  }, [invoices, query]);

  const download = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      // 1. Prefer the server-generated, GST-complete PDF from private storage.
      const storageUrl = await getInvoicePdfUrl(invoice);
      if (storageUrl) {
        window.open(storageUrl, "_blank");
        return;
      }

      // 2. No PDF on file yet — ask the server to generate one from the
      //    live invoice + firm data, then open the signed URL.
      try {
        const generated = await generateInvoicePdf({ data: { invoiceId: invoice.id } });
        if (generated.pdfUrl) {
          window.open(generated.pdfUrl, "_blank");
          await refetch();
          return;
        }
      } catch (genErr) {
        console.warn("Server PDF generation failed; using client fallback", genErr);
        void refetch();
      }

      // 3. Last resort: client-side branded fallback.
      await downloadInvoicePdf({
        invoiceNumber: invoice.invoice_number,
        invoiceDate: new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(invoice.invoice_date)),
        orderNumber: invoice.orders?.order_number ?? invoice.order_id.slice(0, 8),
        dealer: {
          name: `Dealer ${invoice.dealer_id.slice(0, 8)}`,
          gstin: null,
          pan: null,
          address: null,
          city: null,
          state: null,
        },
        items: [
          {
            name: "Delivery against order",
            quantity: 1,
            unitPrice: invoice.grand_total,
            total: invoice.grand_total,
          },
        ],
        subtotal: invoice.subtotal,
        gst: invoice.total_gst,
        total: invoice.grand_total,
      });
      toast.success(`Invoice ${invoice.invoice_number} downloaded.`);
    } finally {
      setDownloadingId(null);
    }
  };

  const statusLabel = (s: Invoice["status"]) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <AppShell>
      <PageTitle
        title="Invoices"
        subtitle={
          invoices ? `${invoices.length} invoices on file` : "GST-compliant · downloadable PDFs"
        }
      />

      <KycGate feature="download invoices">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search invoice # or order #"
              className="h-10 w-full rounded-xl border border-border/70 bg-[var(--surface-2)] pl-9 pr-3 text-sm outline-none focus:border-[var(--silver-muted)]"
            />
          </div>
        </div>

        {isLoading ? (
          <GlassCard className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading invoices…
          </GlassCard>
        ) : isError ? (
          <GlassCard className="p-10 text-center text-sm text-[var(--loss)]">
            Could not load your invoices. Please refresh.
          </GlassCard>
        ) : filtered.length === 0 ? (
          <GlassCard className="p-10 text-center text-sm text-muted-foreground">
            {query ? "No invoices match your search." : "No invoices yet."}
          </GlassCard>
        ) : (
          <>
            <GlassCard className="hidden overflow-hidden md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="p-4 text-left">Invoice</th>
                    <th className="p-4 text-left">Order</th>
                    <th className="p-4 text-left">Date</th>
                    <th className="p-4 text-right">GST</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr
                      key={i.id}
                      className="border-b border-border/40 last:border-0 hover:bg-[var(--surface-2)]/60"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-3)]">
                            <FileText className="h-4 w-4 text-[var(--platinum)]" />
                          </div>
                          <span className="font-mono">{i.invoice_number}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">
                        {i.orders?.order_number ?? i.order_id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Intl.DateTimeFormat("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(i.invoice_date))}
                      </td>
                      <td className="p-4 text-right font-mono">{fmtINR(i.total_gst)}</td>
                      <td className="p-4 text-right font-mono">₹{fmtINR(i.grand_total)}</td>
                      <td className="p-4">
                        <span
                          className={
                            (statusTone[i.status] ?? statusTone.draft) +
                            " rounded-full px-2.5 py-1 text-[11px]"
                          }
                        >
                          {statusLabel(i.status)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => void download(i)}
                          disabled={downloadingId === i.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1.5 text-xs hover:bg-[var(--surface-3)] disabled:opacity-50"
                        >
                          {downloadingId === i.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>

            <div className="grid gap-3 md:hidden">
              {filtered.map((i) => (
                <GlassCard key={i.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-sm">{i.invoice_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(i.invoice_date))}{" "}
                        · {i.orders?.order_number ?? "—"}
                      </div>
                    </div>
                    <span
                      className={
                        (statusTone[i.status] ?? statusTone.draft) +
                        " rounded-full px-2.5 py-1 text-[11px]"
                      }
                    >
                      {statusLabel(i.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-mono text-sm">₹{fmtINR(i.grand_total)}</span>
                    <button
                      onClick={() => void download(i)}
                      disabled={downloadingId === i.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      {downloadingId === i.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Download
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </>
        )}
      </KycGate>
    </AppShell>
  );
}
