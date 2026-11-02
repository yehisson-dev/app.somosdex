import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await sql`
    SELECT
      q.id, q.quote_number, q.status, q.currency, q.notes, q.company,
      q.tax_rate, q.tax_amount, q.subtotal, q.total,
      q.converted_to_invoice_id,
      to_char(q.issue_date,  'YYYY-MM-DD') AS issue_date,
      to_char(q.expiry_date, 'YYYY-MM-DD') AS expiry_date,
      CASE WHEN c.id IS NOT NULL THEN json_build_object(
        'id',c.id,'name',c.name,'color',c.color,'email',c.email,'company',c.company
      ) END AS client
    FROM quotes q
    LEFT JOIN clients c ON c.id = q.client_id
    ORDER BY q.created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { client_id, issue_date, expiry_date, notes, tax_rate, currency, company, items } = body;

  const seqRow = await sql`SELECT nextval('quote_seq') AS n`;
  const num = String((seqRow[0] as any).n).padStart(4, "0");
  const quote_number = `COT-${num}`;

  const subtotal = (items ?? []).reduce((s: number, it: any) =>
    s + Number(it.quantity ?? 1) * Number(it.unit_price ?? 0), 0);
  const tax = Number(tax_rate ?? 0);
  const tax_amount = subtotal * (tax / 100);
  const total = subtotal + tax_amount;

  const rows = await sql`
    INSERT INTO quotes (quote_number, client_id, company, issue_date, expiry_date, notes, tax_rate, tax_amount, subtotal, total, currency, created_by)
    VALUES (
      ${quote_number}, ${client_id ?? null}, ${company ?? null},
      ${issue_date ?? new Date().toISOString().split("T")[0]},
      ${expiry_date ?? null}, ${notes ?? null},
      ${tax}, ${tax_amount}, ${subtotal}, ${total}, ${currency ?? "USD"},
      ${session.user.id}
    )
    RETURNING *
  `;
  const quote = rows[0] as any;

  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itTotal = Number(it.quantity ?? 1) * Number(it.unit_price ?? 0);
      await sql`
        INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, total, position)
        VALUES (${quote.id}, ${it.service_id ?? null}, ${it.description ?? ""}, ${Number(it.quantity ?? 1)}, ${Number(it.unit_price ?? 0)}, ${itTotal}, ${i})
      `;
    }
  }

  return NextResponse.json({ ...quote, quote_number });
}
