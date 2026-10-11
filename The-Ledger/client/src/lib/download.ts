import type { PortalInvoice } from "@/lib/portalProjections";
import { formatDate } from "@/lib/format";

/** Trigger a browser download for in-memory content. Safe to call in tests; failures are swallowed. */
export function downloadFile(filename: string, content: string, mime = "text/html;charset=utf-8") {
  try {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* download unavailable */
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

/**
 * Client-facing invoice as a printable HTML file. Built only from the portal
 * projection (PortalInvoice), so it can never carry internal cost data.
 */
export function buildInvoiceHtml(inv: PortalInvoice, clientName?: string): string {
  const rows = inv.lineItems
    .map((l) => `<tr><td>${esc(l.description)}</td><td class="n">${l.qty}</td><td class="n">${gbp(l.unitPrice)}</td><td class="n">${gbp(l.qty * l.unitPrice)}</td></tr>`)
    .join("");
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Invoice ${esc(inv.invoiceId)}</title>
<style>body{font:14px system-ui,sans-serif;max-width:720px;margin:32px auto;color:#111}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}.n{text-align:right}.tot td{font-weight:600;border-top:2px solid #111}</style></head><body>
<h1>Invoice ${esc(inv.invoiceId)}</h1>
<p>${clientName ? `${esc(clientName)}<br>` : ""}${inv.projectTitle ? `Project: ${esc(inv.projectTitle)}<br>` : ""}Issued ${formatDate(inv.issueDate)} · Due ${formatDate(inv.dueDate)} · Status: ${esc(inv.status)}</p>
<table><thead><tr><th>Description</th><th class="n">Qty</th><th class="n">Unit price</th><th class="n">Amount</th></tr></thead><tbody>${rows}</tbody>
<tfoot><tr class="tot"><td colspan="3">Total</td><td class="n">${gbp(inv.total)}</td></tr>
<tr><td colspan="3">Paid</td><td class="n">${gbp(inv.amountPaid)}</td></tr>
<tr><td colspan="3">Outstanding</td><td class="n">${gbp(inv.amountOutstanding)}</td></tr></tfoot></table></body></html>`;
}
