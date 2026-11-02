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
      q.*,
      to_char(q.issue_date,  'YYYY-MM-DD') AS issue_date,
      to_char(q.expiry_date, 'YYYY-MM-DD') AS expiry_date,
      CASE WHEN c.id IS NOT NULL THEN json_build_object(
        'id',c.id,'name',c.name,'email',c.email,'company',c.company,'address',c.address
      ) END AS client,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id',qi.id,'description',qi.description,'quantity',qi.quantity,
          'unit_price',qi.unit_price,'total',qi.total,'service_id',qi.service_id
        ) ORDER BY qi.position)
        FROM quote_items qi WHERE qi.quote_id = q.id
      ),'[]') AS items
    FROM quotes q LEFT JOIN clients c ON c.id = q.client_id
    WHERE q.id = ${id} LIMIT 1
  `;
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  // Quick status update
  if (body.status && Object.keys(body).length === 1) {
    await sql`UPDATE quotes SET status = ${body.status}, updated_at = now() WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  }

  // Full edit
  const { client_id, issue_date, expiry_date, notes, tax_rate, currency, company, items } = body;
  const subtotal = (items ?? []).reduce((s: number, it: any) =>
    s + Number(it.quantity ?? 1) * Number(it.unit_price ?? 0), 0);
  const tax = Number(tax_rate ?? 0);
  const tax_amount = subtotal * (tax / 100);
  const total = subtotal + tax_amount;

  await sql`
    UPDATE quotes SET
      client_id   = ${client_id ?? null},
      company     = ${company ?? null},
      issue_date  = ${issue_date ?? null},
      expiry_date = ${expiry_date ?? null},
      notes       = ${notes ?? null},
      tax_rate    = ${tax},
      tax_amount  = ${tax_amount},
      subtotal    = ${subtotal},
      total       = ${total},
      currency    = ${currency ?? "USD"},
      updated_at  = now()
    WHERE id = ${id}
  `;

  if (items) {
    await sql`DELETE FROM quote_items WHERE quote_id = ${id}`;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itTotal = Number(it.quantity ?? 1) * Number(it.unit_price ?? 0);
      await sql`
        INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, total, position)
        VALUES (${id}, ${it.service_id ?? null}, ${it.description ?? ""}, ${Number(it.quantity ?? 1)}, ${Number(it.unit_price ?? 0)}, ${itTotal}, ${i})
      `;
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await sql`DELETE FROM quotes WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
