import { createFileRoute } from "@tanstack/react-router";
import { AppShell, GlassCard, PageTitle } from "@/components/AppShell";
import { Download, FileText, Search } from "lucide-react";
import { KycGate } from "@/components/KycGate";

export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "Invoices · Bombay Silvers" }] }),
  component: Invoices,
});

const invoices = [
  { id: "INV-24-2841", order: "#BS-24-11284", date: "11 Aug 2026", item: "Silver 999 · 50 kg", amt: "44,71,000", gst: "3.00%", status: "Paid" },
  { id: "INV-24-2839", order: "#BS-24-11279", date: "09 Aug 2026", item: "Gold coins · 20 × 50g", amt: "1,44,29,600", gst: "3.00%", status: "Due" },
  { id: "INV-24-2831", order: "#BS-24-11271", date: "05 Aug 2026", item: "Silver bars · 100 kg", amt: "89,42,000", gst: "3.00%", status: "Paid" },
  { id: "INV-24-2820", order: "#BS-24-11268", date: "02 Aug 2026", item: "Gold 999 · 500 g", amt: "36,07,400", gst: "3.00%", status: "Paid" },
  { id: "INV-24-2812", order: "#BS-24-11261", date: "28 Jul 2026", item: "Silver 999 · 200 kg", amt: "1,78,84,000", gst: "3.00%", status: "Paid" },
];

function Invoices() {
  return (
    <AppShell>
      <PageTitle
        title="Invoices"
        subtitle="GST-compliant · downloadable PDFs"
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-[var(--surface-2)] px-4 text-sm hover:bg-[var(--surface-3)]">
            <Download className="h-4 w-4" /> Export all
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search invoice # or order #"
            className="h-10 w-full rounded-xl border border-border/70 bg-[var(--surface-2)] pl-9 pr-3 text-sm outline-none focus:border-[var(--silver-muted)]"
          />
        </div>
      </div>

      <GlassCard className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 text-[11px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-4 text-left">Invoice</th>
              <th className="p-4 text-left">Order</th>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Item</th>
              <th className="p-4 text-right">GST</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} className="border-b border-border/40 last:border-0 hover:bg-[var(--surface-2)]/60">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-3)]">
                      <FileText className="h-4 w-4 text-[var(--platinum)]" />
                    </div>
                    <span className="font-mono">{i.id}</span>
                  </div>
                </td>
                <td className="p-4 font-mono text-xs text-muted-foreground">{i.order}</td>
                <td className="p-4 text-muted-foreground">{i.date}</td>
                <td className="p-4">{i.item}</td>
                <td className="p-4 text-right font-mono">{i.gst}</td>
                <td className="p-4 text-right font-mono">₹{i.amt}</td>
                <td className="p-4">
                  <span className={"rounded-full px-2.5 py-1 text-[11px] " + (i.status === "Paid" ? "bg-[var(--gain)]/10 text-[var(--gain)]" : "bg-[var(--warn)]/10 text-[var(--warn)]")}>{i.status}</span>
                </td>
                <td className="p-4 text-right">
                  <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1.5 text-xs hover:bg-[var(--surface-3)]">
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      <div className="grid gap-3 md:hidden">
        {invoices.map((i) => (
          <GlassCard key={i.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-sm">{i.id}</div>
                <div className="text-xs text-muted-foreground">{i.date} · {i.order}</div>
              </div>
              <span className={"rounded-full px-2.5 py-1 text-[11px] " + (i.status === "Paid" ? "bg-[var(--gain)]/10 text-[var(--gain)]" : "bg-[var(--warn)]/10 text-[var(--warn)]")}>{i.status}</span>
            </div>
            <div className="mt-3 text-sm">{i.item}</div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-mono text-sm">₹{i.amt}</span>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}
