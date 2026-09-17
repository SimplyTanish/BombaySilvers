import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export type InvoicePdfData = {
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  dealer: { name: string; gstin?: string | null; pan?: string | null; address?: string | null; city?: string | null; state?: string | null };
  items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  gst: number;
  total: number;
};

const money = (value: number) => `₹${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

export async function renderInvoicePdfBytes(data: InvoicePdfData): Promise<Uint8Array> {
  const pdf = await renderInvoicePdf(data);
  return new Uint8Array(pdf.output("arraybuffer"));
}

export async function downloadInvoicePdf(data: InvoicePdfData) {
  const pdf = await renderInvoicePdf(data);
  pdf.save(`${data.invoiceNumber}.pdf`);
}

async function renderInvoicePdf(data: InvoicePdfData) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const width = pdf.internal.pageSize.getWidth();
  const qr = await QRCode.toDataURL(`BOMBAY-SILVERS|${data.invoiceNumber}|${data.orderNumber}|${data.total.toFixed(2)}`, { margin: 0, width: 240, color: { dark: "#18181b", light: "#ffffff" } });

  pdf.setFillColor(24, 24, 27); pdf.rect(0, 0, width, 38, "F");
  pdf.setTextColor(242, 242, 244); pdf.setFont("helvetica", "bold"); pdf.setFontSize(20); pdf.text("BOMBAY SILVERS", 16, 18);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.text("Dealer Terminal · Est. 1984", 16, 24);
  pdf.setFontSize(10); pdf.text("TAX INVOICE", width - 16, 18, { align: "right" });
  pdf.setFontSize(8); pdf.text(data.invoiceNumber, width - 16, 24, { align: "right" });

  pdf.setTextColor(24, 24, 27); pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.text("BILL TO", 16, 50); pdf.text("INVOICE DETAILS", 118, 50);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text(data.dealer.name, 16, 57);
  const address = [data.dealer.address, data.dealer.city, data.dealer.state].filter(Boolean).join(", ") || "Address on file";
  pdf.setFontSize(8); pdf.text(pdf.splitTextToSize(address, 85), 16, 63);
  pdf.text(`GSTIN: ${data.dealer.gstin ?? "Pending"}`, 16, 78); pdf.text(`PAN: ${data.dealer.pan ?? "Pending"}`, 16, 84);
  pdf.text(`Invoice date: ${data.invoiceDate}`, 118, 57); pdf.text(`Order: ${data.orderNumber}`, 118, 63); pdf.text("GST: 3.00%", 118, 69);

  const top = 96; pdf.setFillColor(235, 235, 238); pdf.rect(16, top, width - 32, 9, "F"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
  pdf.text("PRODUCT", 19, top + 5.8); pdf.text("QTY", 112, top + 5.8, { align: "right" }); pdf.text("RATE", 145, top + 5.8, { align: "right" }); pdf.text("TOTAL", width - 19, top + 5.8, { align: "right" });
  let y = top + 16; pdf.setFont("helvetica", "normal");
  data.items.forEach((item) => { pdf.setFontSize(9); pdf.text(item.name, 19, y); pdf.text(String(item.quantity), 112, y, { align: "right" }); pdf.text(money(item.unitPrice), 145, y, { align: "right" }); pdf.text(money(item.total), width - 19, y, { align: "right" }); pdf.setDrawColor(225, 225, 228); pdf.line(16, y + 5, width - 16, y + 5); y += 11; });
  y += 8; pdf.setFontSize(9); pdf.text("Subtotal", 135, y, { align: "right" }); pdf.text(money(data.subtotal), width - 19, y, { align: "right" }); y += 7; pdf.text("GST (3.00%)", 135, y, { align: "right" }); pdf.text(money(data.gst), width - 19, y, { align: "right" }); y += 10;
  pdf.setFillColor(24, 24, 27); pdf.rect(120, y - 6, width - 136, 12, "F"); pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.text("GRAND TOTAL", 124, y + 1.5); pdf.text(money(data.total), width - 19, y + 1.5, { align: "right" });
  pdf.setTextColor(24, 24, 27); pdf.addImage(qr, "PNG", 16, y - 7, 28, 28); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.text("Scan to verify invoice", 16, y + 25);
  pdf.setDrawColor(225, 225, 228); pdf.line(16, 274, width - 16, 274); pdf.setFontSize(7); pdf.setTextColor(105, 105, 112); pdf.text("This is a system-generated GST invoice from Bombay Silvers. Please retain for your records.", width / 2, 280, { align: "center" });
  return pdf;
}
