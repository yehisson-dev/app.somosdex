import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const rows = await sql`
    SELECT
      i.*,
      CASE WHEN c.id IS NOT NULL THEN json_build_object(
        'id',c.id,'name',c.name,'color',c.color,'email',c.email,
        'company',c.company,'address',c.address
      ) END AS client,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id',ii.id,'description',ii.description,'quantity',ii.quantity,
          'unit_price',ii.unit_price,'total',ii.total,'service_id',ii.service_id,'position',ii.position
        ) ORDER BY ii.position)
        FROM invoice_items ii WHERE ii.invoice_id = i.id
      ),'[]') AS items
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { status } = await req.json();
  if (!status) return NextResponse.json({ error: "status requerido" }, { status: 400 });

  await sql`UPDATE invoices SET status = ${status}, updated_at = now() WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
