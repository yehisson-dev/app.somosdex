import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await sql`
    SELECT
      i.*,
      CASE WHEN c.id IS NOT NULL THEN json_build_object('id',c.id,'name',c.name,'color',c.color,'email',c.email,'company',c.company) END AS client
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    ORDER BY i.created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { client_id, issue_date, due_date, notes, tax_rate, currency, items } = body;

  // Generar número de factura
  const seqRow = await sql`SELECT nextval('invoice_seq') AS n`;
  const num = String((seqRow[0] as any).n).padStart(4, "0");
  const invoice_number = `INV-${num}`;

  // Calcular totales
  const subtotal = (items ?? []).reduce((s: number, it: any) =>
    s + Number(it.quantity ?? 1) * Number(it.unit_price ?? 0), 0);
  const tax = Number(tax_rate ?? 0);
  const tax_amount = subtotal * (tax / 100);
  const total = subtotal + tax_amount;

  const invRows = await sql`
    INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, notes, tax_rate, tax_amount, subtotal, total, currency, created_by)
    VALUES (
      ${invoice_number},
      ${client_id ?? null},
      ${issue_date ?? new Date().toISOString().split("T")[0]},
      ${due_date ?? null},
      ${notes ?? null},
      ${tax},
      ${tax_amount},
      ${subtotal},
      ${total},
      ${currency ?? "USD"},
      ${session.user.id}
    )
    RETURNING *
  `;
  const invoice = invRows[0] as any;

  // Insertar ítems
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itTotal = Number(it.quantity ?? 1) * Number(it.unit_price ?? 0);
      await sql`
        INSERT INTO invoice_items (invoice_id, service_id, description, quantity, unit_price, total, position)
        VALUES (
          ${invoice.id},
          ${it.service_id ?? null},
          ${it.description ?? ""},
          ${Number(it.quantity ?? 1)},
          ${Number(it.unit_price ?? 0)},
          ${itTotal},
          ${i}
        )
      `;
    }
  }

  return NextResponse.json({ ...invoice, invoice_number });
}
