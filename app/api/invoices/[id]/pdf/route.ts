import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

function fmt(n: number | string, currency = "USD") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency }).format(Number(n));
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" });
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador", sent: "Enviada", paid: "Pagada", cancelled: "Cancelada",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280", sent: "#3b82f6", paid: "#10b981", cancelled: "#ef4444",
};

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await params;
  const rows = await sql`
    SELECT i.*,
      CASE WHEN c.id IS NOT NULL THEN json_build_object(
        'id',c.id,'name',c.name,'email',c.email,'company',c.company,'address',c.address
      ) END AS client,
      COALESCE((
        SELECT json_agg(json_build_object(
          'description',ii.description,'quantity',ii.quantity,
          'unit_price',ii.unit_price,'total',ii.total
        ) ORDER BY ii.position)
        FROM invoice_items ii WHERE ii.invoice_id = i.id
      ),'[]') AS items
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ${id} LIMIT 1
  `;
  if (!rows[0]) return new NextResponse("Not found", { status: 404 });
  const inv = rows[0] as any;
  const client = inv.client ?? {};
  const items: any[] = inv.items ?? [];
  const statusColor = STATUS_COLORS[inv.status] ?? "#6b7280";
  const statusLabel = STATUS_LABELS[inv.status] ?? inv.status;

  const itemRows = items.map((it, i) => `
    <tr class="${i % 2 === 0 ? "bg-white" : "bg-gray-50"}">
      <td class="px-4 py-3 text-sm text-gray-700">${it.description}</td>
      <td class="px-4 py-3 text-sm text-gray-600 text-center">${it.quantity}</td>
      <td class="px-4 py-3 text-sm text-gray-600 text-right">${fmt(it.unit_price, inv.currency)}</td>
      <td class="px-4 py-3 text-sm font-medium text-gray-900 text-right">${fmt(it.total, inv.currency)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Factura ${inv.invoice_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 48px 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .brand { display: flex; flex-direction: column; gap: 4px; }
  .brand-name { font-size: 22px; font-weight: 800; color: #8b5cf6; letter-spacing: -0.5px; }
  .brand-sub { font-size: 12px; color: #6b7280; }
  .invoice-meta { text-align: right; }
  .invoice-number { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 6px; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; color: #fff; background: ${statusColor}; }
  .divider { border: none; border-top: 1px solid #e5e7eb; margin: 28px 0; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .meta-section h4 { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; margin-bottom: 8px; }
  .meta-section p { font-size: 14px; color: #374151; line-height: 1.5; }
  .meta-section .name { font-size: 15px; font-weight: 600; color: #111827; }
  .dates { display: flex; gap: 32px; }
  .date-item label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; display: block; margin-bottom: 4px; }
  .date-item span { font-size: 14px; color: #374151; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead { background: #8b5cf6; }
  thead th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #fff; }
  thead th:not(:first-child) { text-align: right; }
  thead th:nth-child(2) { text-align: center; }
  tbody tr { border-bottom: 1px solid #f3f4f6; }
  tbody td { padding: 12px 16px; }
  .totals { margin-left: auto; width: 260px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #6b7280; }
  .totals-row.tax { border-top: 1px solid #f3f4f6; }
  .totals-row.total { border-top: 2px solid #8b5cf6; padding-top: 12px; margin-top: 4px; font-weight: 700; font-size: 16px; color: #111827; }
  .totals-row.total span:last-child { color: #8b5cf6; }
  .notes { background: #f9fafb; border-left: 3px solid #8b5cf6; border-radius: 4px; padding: 14px 16px; margin-top: 32px; }
  .notes h4 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; margin-bottom: 6px; }
  .notes p { font-size: 13px; color: #6b7280; line-height: 1.6; white-space: pre-wrap; }
  .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #9ca3af; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page { padding: 24px; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <div class="brand-name">Cubo Digital</div>
      <div class="brand-sub">app.somosdex.com</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-number">${inv.invoice_number}</div>
      <div class="status-badge">${statusLabel}</div>
    </div>
  </div>

  <hr class="divider">

  <div class="meta-grid">
    <div class="meta-section">
      <h4>Facturar a</h4>
      <p class="name">${client.name ?? "—"}</p>
      ${client.company ? `<p>${client.company}</p>` : ""}
      ${client.email ? `<p>${client.email}</p>` : ""}
      ${client.address ? `<p>${client.address}</p>` : ""}
    </div>
    <div class="meta-section" style="text-align:right">
      <h4>Fechas</h4>
      <div class="dates" style="justify-content:flex-end">
        <div class="date-item">
          <label>Emisión</label>
          <span>${fmtDate(inv.issue_date)}</span>
        </div>
        ${inv.due_date ? `<div class="date-item"><label>Vencimiento</label><span>${fmtDate(inv.due_date)}</span></div>` : ""}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th style="text-align:center">Cant.</th>
        <th style="text-align:right">Precio unit.</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af;font-size:13px">Sin ítems</td></tr>'}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${fmt(inv.subtotal, inv.currency)}</span></div>
    ${Number(inv.tax_rate) > 0 ? `<div class="totals-row tax"><span>ITBIS (${inv.tax_rate}%)</span><span>${fmt(inv.tax_amount, inv.currency)}</span></div>` : ""}
    <div class="totals-row total"><span>Total</span><span>${fmt(inv.total, inv.currency)}</span></div>
  </div>

  ${inv.notes ? `<div class="notes"><h4>Notas</h4><p>${inv.notes}</p></div>` : ""}

  <div class="footer">Generado por Cubo Digital · ${new Date().toLocaleDateString("es-DO")}</div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
