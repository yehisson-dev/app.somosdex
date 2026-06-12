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
      i.id, i.invoice_number, i.status, i.currency, i.notes,
      i.tax_rate, i.tax_amount, i.subtotal, i.total, i.client_id,
      to_char(i.issue_date, 'YYYY-MM-DD') AS issue_date,
      to_char(i.due_date,   'YYYY-MM-DD') AS due_date,
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
  const body = await req.json();

  // Actualización de solo estado (llamada rápida desde la tabla)
  if (body.status && Object.keys(body).length === 1) {
    await sql`UPDATE invoices SET status = ${body.status}, updated_at = now() WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  }

  // Actualización completa desde el formulario de edición
  const { client_id, issue_date, due_date, notes, tax_rate, currency, items, status } = body;

  const subtotal = (items ?? []).reduce((s: number, it: any) =>
    s + Number(it.quantity ?? 1) * Number(it.unit_price ?? 0), 0);
  const tax = Number(tax_rate ?? 0);
  const tax_amount = subtotal * (tax / 100);
  const total = subtotal + tax_amount;

  await sql`
    UPDATE invoices SET
      client_id   = ${client_id ?? null},
      issue_date  = ${issue_date},
      due_date    = ${due_date ?? null},
      notes       = ${notes ?? null},
      tax_rate    = ${tax},
      tax_amount  = ${tax_amount},
      subtotal    = ${subtotal},
      total       = ${total},
      currency    = ${currency ?? "USD"},
      status      = ${status ?? "draft"},
      updated_at  = now()
    WHERE id = ${id}
  `;

  // Reemplazar ítems
  await sql`DELETE FROM invoice_items WHERE invoice_id = ${id}`;
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itTotal = Number(it.quantity ?? 1) * Number(it.unit_price ?? 0);
      await sql`
        INSERT INTO invoice_items (invoice_id, service_id, description, quantity, unit_price, total, position)
        VALUES (${id}, ${it.service_id ?? null}, ${it.description ?? ""}, ${Number(it.quantity ?? 1)}, ${Number(it.unit_price ?? 0)}, ${itTotal}, ${i})
      `;
    }
  }

  return NextResponse.json({ ok: true, subtotal, tax_amount, total });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
