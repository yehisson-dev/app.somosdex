import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.somosdex.com";

const COMPANY = {
  logo:    `${BASE_URL}/logo-dex.jpg`,
  name:    "Dex",
  phone:   "(809) 769 3893",
  address: "Santiago, República Dominicana 51800",
  rnc:     "RNC 1-32-95841-1",
  email:   "yehisson@somosdex.com",
};

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
    <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}">
      <td class="td-desc">${it.description}</td>
      <td class="td-num" style="text-align:center">${it.quantity}</td>
      <td class="td-num">${fmt(it.unit_price, inv.currency)}</td>
      <td class="td-num td-bold">${fmt(it.total, inv.currency)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Factura ${inv.invoice_number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#111827; background:#fff; font-size:13px; }
  .page { max-width:820px; margin:0 auto; padding:48px 44px 36px; }

  /* ── HEADER ── */
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }
  .logo { height:64px; width:auto; object-fit:contain; }
  .company-info { margin-top:10px; line-height:1.7; color:#4b5563; font-size:12px; }
  .company-info strong { display:block; color:#1e2d47; font-size:14px; font-weight:700; margin-bottom:2px; }
  .invoice-meta { text-align:right; }
  .invoice-title { font-size:26px; font-weight:800; color:#1e2d47; letter-spacing:-0.5px; }
  .invoice-number { font-size:14px; color:#6b7280; margin:4px 0 10px; }
  .status-badge { display:inline-block; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; color:#fff; background:${statusColor}; letter-spacing:.04em; text-transform:uppercase; }

  /* ── DIVIDER ── */
  .divider { border:none; border-top:2px solid #f3c842; margin:24px 0; }

  /* ── BILL-TO + DATES ── */
  .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; }
  .meta-section h4 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:#9ca3af; margin-bottom:8px; }
  .meta-section .client-name { font-size:15px; font-weight:700; color:#111827; }
  .meta-section p { font-size:13px; color:#4b5563; line-height:1.6; }
  .dates { display:flex; gap:28px; justify-content:flex-end; }
  .date-item label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#9ca3af; display:block; margin-bottom:3px; }
  .date-item span { font-size:13px; color:#374151; }

  /* ── TABLE ── */
  table { width:100%; border-collapse:collapse; margin-bottom:20px; border-radius:8px; overflow:hidden; }
  thead tr { background:#1e2d47; }
  thead th { padding:11px 16px; text-align:right; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#fff; }
  thead th:first-child { text-align:left; }
  thead th:nth-child(2) { text-align:center; }
  tbody tr { border-bottom:1px solid #f3f4f6; }
  .td-desc { padding:11px 16px; font-size:13px; color:#374151; }
  .td-num  { padding:11px 16px; font-size:13px; color:#4b5563; text-align:right; }
  .td-bold { font-weight:600; color:#111827; }

  /* ── TOTALS ── */
  .totals { margin-left:auto; width:280px; margin-bottom:32px; }
  .t-row { display:flex; justify-content:space-between; padding:5px 0; font-size:13px; color:#6b7280; }
  .t-row.t-tax { border-top:1px solid #f3f4f6; }
  .t-row.t-total { border-top:2px solid #1e2d47; padding-top:10px; margin-top:4px; font-weight:700; font-size:16px; color:#111827; }
  .t-row.t-total span:last-child { color:#1e2d47; }

  /* ── NOTES ── */
  .notes { background:#f9fafb; border-left:3px solid #f3c842; border-radius:4px; padding:14px 16px; margin-bottom:32px; }
  .notes h4 { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#9ca3af; margin-bottom:6px; }
  .notes p { font-size:13px; color:#6b7280; line-height:1.6; white-space:pre-wrap; }

  /* ── FOOTER ── */
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

  <!-- HEADER -->
  <div class="header">
    <div>
      <img src="${COMPANY.logo}" alt="Dex" class="logo" />
      <div class="company-info">
        <strong>${COMPANY.name}</strong>
        ${COMPANY.phone}<br>
        ${COMPANY.address}<br>
        ${COMPANY.rnc}<br>
        ${COMPANY.email}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">FACTURA</div>
      <div class="invoice-number">${inv.invoice_number}</div>
      <div class="status-badge">${statusLabel}</div>
    </div>
  </div>

  <hr class="divider">

  <!-- DATOS CLIENTE + FECHAS -->
  <div class="meta-grid">
    <div class="meta-section">
      <h4>Facturar a</h4>
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
          <span>${fmtDate(inv.issue_date)}</span>
        </div>
        ${inv.due_date ? `<div class="date-item"><label>Vencimiento</label><span>${fmtDate(inv.due_date)}</span></div>` : ""}
      </div>
    </div>
  </div>

  <!-- TABLA DE SERVICIOS -->
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

  <!-- TOTALES -->
  <div class="totals">
    <div class="t-row"><span>Subtotal</span><span>${fmt(inv.subtotal, inv.currency)}</span></div>
    ${Number(inv.tax_rate) > 0 ? `<div class="t-row t-tax"><span>ITBIS (${inv.tax_rate}%)</span><span>${fmt(inv.tax_amount, inv.currency)}</span></div>` : ""}
    <div class="t-row t-total"><span>Total</span><span>${fmt(inv.total, inv.currency)}</span></div>
  </div>

  <!-- NOTAS -->
  ${inv.notes ? `<div class="notes"><h4>Notas</h4><p>${inv.notes}</p></div>` : ""}

  <!-- PIE DE PÁGINA -->
  <div class="footer">
    <div class="footer-legal">Tipo de factura digital sin valor fiscal.</div>
    <div class="footer-date">Emitida el ${new Date().toLocaleDateString("es-DO", { day:"numeric", month:"long", year:"numeric" })}</div>
  </div>

</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
