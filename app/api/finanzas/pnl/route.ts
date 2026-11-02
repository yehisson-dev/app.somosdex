import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/finanzas/pnl?month=7&year=2026&company=all
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

  // ── Ingresos reales: pagos recibidos en el período ──────────────────────────
  const ingresoRows = await sql`
    SELECT
      ip.currency,
      SUM(ip.amount)                                AS total_paid,
      json_agg(json_build_object(
        'date',           to_char(ip.payment_date, 'YYYY-MM-DD'),
        'amount',         ip.amount,
        'currency',       ip.currency,
        'invoice_number', i.invoice_number,
        'client',         c.name,
        'company',        COALESCE(i.company, 'CUBO'),
        'tax_rate',       i.tax_rate
      ) ORDER BY ip.payment_date) AS detail
    FROM invoice_payments ip
    JOIN invoices i ON i.id = ip.invoice_id
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE ip.payment_date BETWEEN ${start}::date AND ${end}::date
      ${company !== "all" ? sql`AND i.company = ${company}` : sql``}
    GROUP BY ip.currency
  `;

  // ── Gastos reales del período ───────────────────────────────────────────────
  const gastoRows = await sql`
    SELECT
      e.currency,
      e.category_id,
      ec.name AS category_name,
      ec.color AS category_color,
      SUM(e.amount) AS total,
      json_agg(json_build_object(
        'date',        e.date,
        'description', COALESCE(e.description, e.company),
        'amount',      e.amount,
        'currency',    e.currency,
        'company',     e.company
      ) ORDER BY e.date) AS detail
    FROM expenses e
    LEFT JOIN expense_categories ec ON ec.id = e.category_id
    WHERE e.type = 'real'
      AND e.date BETWEEN ${start} AND ${end}
      ${company !== "all" ? sql`AND e.company = ${company}` : sql``}
    GROUP BY e.currency, e.category_id, ec.name, ec.color
    ORDER BY total DESC
  `;

  // ── Convertir todo a DOP para el resumen ────────────────────────────────────
  const toDOP = (amount: number, currency: string) =>
    currency === "USD" ? amount * rate : amount;

  const ingresoUSD = Number((ingresoRows as any[]).find(r => r.currency === "USD")?.total_paid ?? 0);
  const ingresoDOP = Number((ingresoRows as any[]).find(r => r.currency === "DOP")?.total_paid ?? 0);
  const ingresoTotalDOP = toDOP(ingresoUSD, "USD") + ingresoDOP;

  const gastoTotalDOP = (gastoRows as any[]).reduce((sum, r) =>
    sum + toDOP(Number(r.total), r.currency), 0);

  // Detalle de ingresos flat
  const ingresoDetail = (ingresoRows as any[]).flatMap(r => r.detail ?? []);

  // Categorías de gastos agrupadas
  const gastoByCategory = (gastoRows as any[]).map(r => ({
    category_id:    r.category_id,
    category_name:  r.category_name ?? "Sin categoría",
    category_color: r.category_color ?? "#6b7280",
    currency:       r.currency,
    total:          Number(r.total),
    total_dop:      toDOP(Number(r.total), r.currency),
    detail:         r.detail ?? [],
  }));

  return NextResponse.json({
    month, year, company,
    exchange_rate: rate,
    ingresos: {
      usd:   ingresoUSD,
      dop:   ingresoDOP,
      total_dop: ingresoTotalDOP,
      detail: ingresoDetail,
    },
    gastos: {
      total_dop: gastoTotalDOP,
      by_category: gastoByCategory,
    },
    utilidad_dop: ingresoTotalDOP - gastoTotalDOP,
    margen_pct: ingresoTotalDOP > 0
      ? Math.round(((ingresoTotalDOP - gastoTotalDOP) / ingresoTotalDOP) * 100)
      : null,
  });
}
