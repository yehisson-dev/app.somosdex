import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.somosdex.com";

function fmt(n: number | string, currency = "USD") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency }).format(Number(n));
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d.slice(0, 10) + "T00:00:00").toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" });
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador", sent: "Enviada", approved: "Aprobada", rejected: "Rechazada", expired: "Expirada",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280", sent: "#3b82f6", approved: "#10b981", rejected: "#ef4444", expired: "#9ca3af",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await params;
  const rows = await sql`
    SELECT
      q.id, q.quote_number, q.status, q.currency, q.notes, q.company,
      q.tax_rate, q.tax_amount, q.subtotal, q.total,
      to_char(q.issue_date,  'YYYY-MM-DD') AS issue_date,
      to_char(q.expiry_date, 'YYYY-MM-DD') AS expiry_date,
      CASE WHEN c.id IS NOT NULL THEN json_build_object(
        'id',c.id,'name',c.name,'email',c.email,'company',c.company,'address',c.address
      ) END AS client,
      COALESCE((
        SELECT json_agg(json_build_object(
          'description',qi.description,'quantity',qi.quantity,
          'unit_price',qi.unit_price,'total',qi.total
        ) ORDER BY qi.position)
        FROM quote_items qi WHERE qi.quote_id = q.id
      ),'[]') AS items
    FROM quotes q LEFT JOIN clients c ON c.id = q.client_id
    WHERE q.id = ${id} LIMIT 1
  `;
  if (!rows[0]) return new NextResponse("Not found", { status: 404 });

  const q = rows[0] as any;

  // Load company data
  const companyRows = await sql`SELECT * FROM companies WHERE id = ${q.company ?? "DEX"} LIMIT 1`;
  const co = (companyRows[0] as any) ?? { name: "Dex", rnc: "RNC 1-32-95841-1", phone: "(809) 769 3893", address: "Santiago, RD", email: "yehisson@somosdex.com" };

  const client = q.client ?? {};
  const items: any[] = q.items ?? [];
  const statusColor = STATUS_COLORS[q.status] ?? "#6b7280";
  const statusLabel = STATUS_LABELS[q.status] ?? q.status;

  const itemRows = items.map((it, i) => `
    <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}">
      <td class="td-desc">${it.description}</td>
      <td class="td-num" style="text-align:center">${it.quantity}</td>
      <td class="td-num">${fmt(it.unit_price, q.currency)}</td>
      <td class="td-num td-bold">${fmt(it.total, q.currency)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cotización ${q.quote_number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#111827; background:#fff; font-size:13px; }
  .page { max-width:820px; margin:0 auto; padding:48px 44px 36px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }
  .logo { height:64px; width:auto; object-fit:contain; }
  .company-info { margin-top:10px; line-height:1.7; color:#4b5563; font-size:12px; }
  .company-info strong { display:block; color:#1e2d47; font-size:14px; font-weight:700; margin-bottom:2px; }
  .invoice-meta { text-align:right; }
  .invoice-title { font-size:26px; font-weight:800; color:#1e2d47; letter-spacing:-0.5px; }
  .invoice-number { font-size:14px; color:#6b7280; margin:4px 0 10px; }
  .status-badge { display:inline-block; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; color:#fff; background:${statusColor}; letter-spacing:.04em; text-transform:uppercase; }
  .divider { border:none; border-top:2px solid #6366f1; margin:24px 0; }
  .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; }
  .meta-section h4 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:#9ca3af; margin-bottom:8px; }
  .meta-section .client-name { font-size:15px; font-weight:700; color:#111827; }
  .meta-section p { font-size:13px; color:#4b5563; line-height:1.6; }
  .dates { display:flex; gap:28px; justify-content:flex-end; }
  .date-item label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#9ca3af; display:block; margin-bottom:3px; }
  .date-item span { font-size:13px; color:#374151; }
  table { width:100%; border-collapse:collapse; margin-bottom:20px; border-radius:8px; overflow:hidden; }
  thead tr { background:#1e2d47; }
  thead th { padding:11px 16px; text-align:right; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#fff; }
  thead th:first-child { text-align:left; }
  thead th:nth-child(2) { text-align:center; }
  tbody tr { border-bottom:1px solid #f3f4f6; }
  .td-desc { padding:11px 16px; font-size:13px; color:#374151; }
  .td-num  { padding:11px 16px; font-size:13px; color:#4b5563; text-align:right; }
  .td-bold { font-weight:600; color:#111827; }
  .totals { margin-left:auto; width:280px; margin-bottom:32px; }
  .t-row { display:flex; justify-content:space-between; padding:5px 0; font-size:13px; color:#6b7280; }
  .t-row.t-tax { border-top:1px solid #f3f4f6; }
  .t-row.t-total { border-top:2px solid #1e2d47; padding-top:10px; margin-top:4px; font-weight:700; font-size:16px; color:#111827; }
  .t-row.t-total span:last-child { color:#6366f1; }
  .notes { background:#f9fafb; border-left:3px solid #6366f1; border-radius:4px; padding:14px 16px; margin-bottom:32px; }
  .notes h4 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#9ca3af; margin-bottom:6px; }
  .notes p { font-size:13px; color:#6b7280; line-height:1.6; white-space:pre-wrap; }
  .validity { background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; padding:10px 14px; margin-bottom:24px; font-size:12px; color:#0369a1; }
  .footer { border-top:1px solid #e5e7eb; padding-top:16px; display:flex; justify-content:space-between; align-items:center; }
  .footer-legal { font-size:11px; color:#9ca3af; font-style:italic; }
  .footer-date  { font-size:11px; color:#9ca3af; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .page { padding:28px 32px 20px; }
    @page { margin:0; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      ${co.logo_url ? `<img src="${BASE_URL}${co.logo_url}" alt="${co.name}" class="logo" />` : ""}
      <div class="company-info">
        <strong>${co.name}</strong>
        ${co.phone ? co.phone + "<br>" : ""}
        ${co.address ? co.address + "<br>" : ""}
        ${co.rnc ? co.rnc + "<br>" : ""}
        ${co.email ?? ""}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">COTIZACIÓN</div>
      <div class="invoice-number">${q.quote_number}</div>
      <div class="status-badge">${statusLabel}</div>
    </div>
  </div>

  <hr class="divider">

  <div class="meta-grid">
    <div class="meta-section">
      <h4>Propuesta para</h4>
      <p class="client-name">${client.name ?? "—"}</p>
      ${client.company ? `<p>${client.company}</p>` : ""}
      ${client.email   ? `<p>${client.email}</p>`   : ""}
      ${client.address ? `<p>${client.address}</p>` : ""}
    </div>
    <div class="meta-section">
      <h4 style="text-align:right">Fechas</h4>
      <div class="dates">
        <div class="date-item">
          <label>Emisión</label>
          <span>${fmtDate(q.issue_date)}</span>
        </div>
        ${q.expiry_date ? `<div class="date-item"><label>Válida hasta</label><span>${fmtDate(q.expiry_date)}</span></div>` : ""}
      </div>
    </div>
  </div>

  ${q.expiry_date ? `<div class="validity">Esta cotización es válida hasta el ${fmtDate(q.expiry_date)}. Pasada esa fecha los precios pueden variar.</div>` : ""}

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th style="text-align:center">Cant.</th>
        <th>Precio unit.</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || `<tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af">Sin ítems</td></tr>`}
    </tbody>
  </table>

  <div class="totals">
    <div class="t-row"><span>Subtotal</span><span>${fmt(q.subtotal, q.currency)}</span></div>
    ${Number(q.tax_rate) > 0 ? `<div class="t-row t-tax"><span>ITBIS (${q.tax_rate}%)</span><span>${fmt(q.tax_amount, q.currency)}</span></div>` : ""}
    <div class="t-row t-total"><span>Total</span><span>${fmt(q.total, q.currency)}</span></div>
  </div>

  ${q.notes ? `<div class="notes"><h4>Notas y condiciones</h4><p>${q.notes}</p></div>` : ""}

  <div class="footer">
    <div class="footer-legal">Esta cotización no es una factura legal hasta ser aceptada.</div>
    <div class="footer-date">Emitida el ${new Date().toLocaleDateString("es-DO", { day:"numeric", month:"long", year:"numeric" })}</div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
