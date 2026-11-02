import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/finanzas/itbis?month=7&year=2026&company=all
// ITBIS = 18% VAT in Dominican Republic
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const month   = parseInt(searchParams.get("month")   ?? String(new Date().getMonth() + 1));
  const year    = parseInt(searchParams.get("year")    ?? String(new Date().getFullYear()));
  const company = searchParams.get("company") ?? "all";

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end   = new Date(year, month, 0).toISOString().slice(0, 10);

  const wsRows = await sql`SELECT usd_to_dop_rate FROM workspace_settings LIMIT 1`;
  const rate   = Number((wsRows[0] as any)?.usd_to_dop_rate ?? 60.50);

  // ── ITBIS cobrado: tax_amount de facturas cobradas en el período ─────────────
  const cobradoRows = await sql`
    SELECT
      i.invoice_number,
      i.issue_date,
      ip.payment_date,
      c.name AS client_name,
      COALESCE(i.company, 'CUBO') AS company,
      i.subtotal,
      i.tax_rate,
      -- ITBIS proporcional al pago recibido
      ROUND((ip.amount / i.total * i.tax_amount)::numeric, 2) AS itbis_amount,
      ip.amount AS paid_amount,
      ip.currency
    FROM invoice_payments ip
    JOIN invoices i ON i.id = ip.invoice_id
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE ip.payment_date BETWEEN ${start}::date AND ${end}::date
      AND i.tax_rate > 0
      ${company !== "all" ? sql`AND i.company = ${company}` : sql``}
    ORDER BY ip.payment_date
  `;

  // ── ITBIS pagado: 18% sobre gastos reales (compras) ────────────────────────
  const pagadoRows = await sql`
    SELECT
      e.date,
      COALESCE(e.description, e.company) AS description,
      e.company,
      e.amount,
      e.currency,
      ec.name AS category_name,
      ROUND((e.amount * 0.18)::numeric, 2) AS itbis_amount
    FROM expenses e
    LEFT JOIN expense_categories ec ON ec.id = e.category_id
    WHERE e.type = 'real'
      AND e.date BETWEEN ${start} AND ${end}
      ${company !== "all" ? sql`AND e.company = ${company}` : sql``}
    ORDER BY e.date
  `;

  const toDOP = (amount: number, currency: string) =>
    currency === "USD" ? amount * rate : amount;

  const itbisCobradoDOP = (cobradoRows as any[]).reduce(
    (s, r) => s + toDOP(Number(r.itbis_amount), r.currency), 0
  );
  const itbisPagadoDOP = (pagadoRows as any[]).reduce(
    (s, r) => s + toDOP(Number(r.itbis_amount), r.currency), 0
  );

  return NextResponse.json({
    month, year, company,
    exchange_rate: rate,
    itbis_cobrado: {
      total_dop: itbisCobradoDOP,
      rows: cobradoRows,
    },
    itbis_pagado: {
      total_dop: itbisPagadoDOP,
      rows: pagadoRows,
    },
    itbis_neto_dop: itbisCobradoDOP - itbisPagadoDOP,
    balance: itbisCobradoDOP > itbisPagadoDOP ? "a_pagar" : "a_favor",
  });
}
