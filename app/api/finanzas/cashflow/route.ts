import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/finanzas/cashflow?months=6
// Returns monthly cash flow: actual collected + projected (pending invoices) + expenses
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const months = Math.min(parseInt(searchParams.get("months") ?? "6"), 12);

  const wsRows = await sql`SELECT usd_to_dop_rate FROM workspace_settings LIMIT 1`;
  const rate   = Number((wsRows[0] as any)?.usd_to_dop_rate ?? 60.50);
  const toDOP  = (a: number, c: string) => c === "USD" ? a * rate : a;

  // Build month buckets: 3 past + current + future up to `months` total
  const today   = new Date();
  const buckets: { key: string; label: string; start: string; end: string }[] = [];
  for (let i = -(Math.min(months - 1, 2)); i < months - Math.min(months - 1, 2); i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key   = `${y}-${String(m).padStart(2, "0")}`;
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const end   = new Date(y, m, 0).toISOString().slice(0, 10);
    const label = d.toLocaleDateString("es-DO", { month: "short", year: "2-digit" });
    buckets.push({ key, label, start, end });
  }

  const allStart = buckets[0].start;
  const allEnd   = buckets[buckets.length - 1].end;

  // Pagos reales recibidos por mes
  const paymentsRaw = await sql`
    SELECT
      to_char(ip.payment_date, 'YYYY-MM') AS month_key,
      ip.currency,
      SUM(ip.amount) AS total
    FROM invoice_payments ip
    WHERE ip.payment_date BETWEEN ${allStart}::date AND ${allEnd}::date
    GROUP BY 1, 2
  `;

  // Facturas pendientes por mes (por su due_date)
  const pendingRaw = await sql`
    SELECT
      to_char(i.due_date, 'YYYY-MM') AS month_key,
      i.currency,
      SUM(i.total - COALESCE(
        (SELECT SUM(ip2.amount) FROM invoice_payments ip2 WHERE ip2.invoice_id = i.id), 0
      )) AS pending
    FROM invoices i
    WHERE i.status IN ('sent', 'partially_paid')
      AND i.due_date BETWEEN ${allStart}::date AND ${allEnd}::date
    GROUP BY 1, 2
  `;

  // Gastos reales por mes
  const gastosRaw = await sql`
    SELECT
      to_char(e.date::date, 'YYYY-MM') AS month_key,
      e.currency,
      SUM(e.amount) AS total
    FROM expenses e
    WHERE e.type = 'real'
      AND e.date BETWEEN ${allStart} AND ${allEnd}
    GROUP BY 1, 2
  `;

  // Gastos proyectados por mes
  const gastosProjRaw = await sql`
    SELECT
      to_char(e.date::date, 'YYYY-MM') AS month_key,
      e.currency,
      SUM(e.amount) AS total
    FROM expenses e
    WHERE e.type = 'projected'
      AND e.date BETWEEN ${allStart} AND ${allEnd}
    GROUP BY 1, 2
  `;

  const sumByMonth = (rows: any[], key: string) => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      map[r.month_key] = (map[r.month_key] ?? 0) + toDOP(Number(r[key] ?? r.total), r.currency);
    }
    return map;
  };

  const paid    = sumByMonth(paymentsRaw as any[], "total");
  const pending = sumByMonth(pendingRaw  as any[], "pending");
  const gastos  = sumByMonth(gastosRaw   as any[], "total");
  const gproj   = sumByMonth(gastosProjRaw as any[], "total");

  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const result = buckets.map(b => {
    const isPast   = b.key < currentKey;
    const isFuture = b.key > currentKey;
    const ingresos = isPast || b.key === currentKey ? (paid[b.key] ?? 0) : 0;
    const proyectado_ingresos = isFuture || b.key === currentKey ? (pending[b.key] ?? 0) : 0;
    const gastos_reales  = gastos[b.key] ?? 0;
    const gastos_proj    = gproj[b.key] ?? 0;
    const neto = ingresos + proyectado_ingresos - gastos_reales - gastos_proj;
    return {
      key: b.key, label: b.label,
      is_past: isPast, is_current: b.key === currentKey, is_future: isFuture,
      ingresos, proyectado_ingresos,
      gastos_reales, gastos_proyectados: gastos_proj,
      neto,
    };
  });

  return NextResponse.json({ months: result, exchange_rate: rate });
}
