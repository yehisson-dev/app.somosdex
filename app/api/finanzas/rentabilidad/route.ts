import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/finanzas/rentabilidad?year=2026
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

  const wsRows = await sql`SELECT usd_to_dop_rate FROM workspace_settings LIMIT 1`;
  const rate   = Number((wsRows[0] as any)?.usd_to_dop_rate ?? 60.50);
  const toDOP  = (a: number, c: string) => c === "USD" ? a * rate : a;

  // Ingresos reales por cliente (pagos recibidos en el año)
  const ingresoRows = await sql`
    SELECT
      c.id   AS client_id,
      c.name AS client_name,
      c.color AS client_color,
      ip.currency,
      SUM(ip.amount) AS paid,
      COUNT(DISTINCT i.id) AS invoice_count,
      SUM(i.total)         AS invoiced_total
    FROM invoice_payments ip
    JOIN invoices i ON i.id = ip.invoice_id
    JOIN clients c ON c.id = i.client_id
    WHERE EXTRACT(YEAR FROM ip.payment_date) = ${year}
    GROUP BY c.id, c.name, c.color, ip.currency
    ORDER BY paid DESC
  `;

  // Pendiente por cobrar por cliente
  const pendingRows = await sql`
    SELECT
      c.id AS client_id,
      i.currency,
      SUM(i.total - COALESCE(
        (SELECT SUM(ip2.amount) FROM invoice_payments ip2 WHERE ip2.invoice_id = i.id), 0
      )) AS pending
    FROM invoices i
    JOIN clients c ON c.id = i.client_id
    WHERE i.status IN ('sent', 'partially_paid')
    GROUP BY c.id, i.currency
  `;

  // Consolidar por cliente
  const clientMap: Record<string, any> = {};
  for (const r of ingresoRows as any[]) {
    if (!clientMap[r.client_id]) {
      clientMap[r.client_id] = {
        id: r.client_id, name: r.client_name, color: r.client_color,
        paid_dop: 0, invoiced_dop: 0, pending_dop: 0, invoice_count: 0,
      };
    }
    clientMap[r.client_id].paid_dop     += toDOP(Number(r.paid), r.currency);
    clientMap[r.client_id].invoiced_dop += toDOP(Number(r.invoiced_total), r.currency);
    clientMap[r.client_id].invoice_count = Number(r.invoice_count);
  }
  for (const r of pendingRows as any[]) {
    if (clientMap[r.client_id]) {
      clientMap[r.client_id].pending_dop += toDOP(Number(r.pending), r.currency);
    }
  }

  const clients = Object.values(clientMap).sort((a, b) => b.paid_dop - a.paid_dop);
  const totalPaid = clients.reduce((s, c) => s + c.paid_dop, 0);

  const result = clients.map(c => ({
    ...c,
    pct_of_total: totalPaid > 0 ? Math.round((c.paid_dop / totalPaid) * 100) : 0,
    collection_rate: c.invoiced_dop > 0
      ? Math.round((c.paid_dop / c.invoiced_dop) * 100)
      : null,
  }));

  // Prospects pipeline value (for forecast)
  const prospectRows = await sql`
    SELECT id, name, company, stage, value, currency
    FROM prospects
    WHERE stage NOT IN ('perdido')
    ORDER BY value DESC
  `;

  const STAGE_PROB: Record<string, number> = {
    contacto: 0.10, calificado: 0.25, propuesta: 0.50, negociacion: 0.75, ganado: 1.0,
  };

  const pipeline = (prospectRows as any[]).map(p => ({
    ...p,
    value_dop:     toDOP(Number(p.value), p.currency),
    probability:   STAGE_PROB[p.stage] ?? 0.1,
    weighted_dop:  toDOP(Number(p.value), p.currency) * (STAGE_PROB[p.stage] ?? 0.1),
  }));

  const pipelineWeightedTotal = pipeline.reduce((s, p) => s + p.weighted_dop, 0);

  return NextResponse.json({
    year,
    exchange_rate: rate,
    clients: result,
    total_paid_dop: totalPaid,
    pipeline: { prospects: pipeline, weighted_total_dop: pipelineWeightedTotal },
  });
}
