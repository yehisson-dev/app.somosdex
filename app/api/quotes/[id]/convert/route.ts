import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Load quote with items
  const quotes = await sql`
    SELECT q.*, to_char(q.issue_date,'YYYY-MM-DD') AS issue_date, to_char(q.expiry_date,'YYYY-MM-DD') AS expiry_date
    FROM quotes q WHERE q.id = ${id} LIMIT 1
  `;
  const quote = quotes[0] as any;
  if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
  if (quote.converted_to_invoice_id)
    return NextResponse.json({ error: "Esta cotización ya fue convertida" }, { status: 400 });

  const qItems = await sql`SELECT * FROM quote_items WHERE quote_id = ${id} ORDER BY position`;

  // Generate invoice number
  const seqRow = await sql`SELECT nextval('invoice_seq') AS n`;
  const num = String((seqRow[0] as any).n).padStart(4, "0");
  const invoice_number = `INV-${num}`;

  // Create invoice
  const invRows = await sql`
    INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, notes, tax_rate, tax_amount, subtotal, total, currency, company, created_by)
    VALUES (
      ${invoice_number}, ${quote.client_id ?? null},
      ${quote.issue_date ?? new Date().toISOString().split("T")[0]},
      ${quote.expiry_date ?? null},
      ${quote.notes ?? null},
      ${quote.tax_rate}, ${quote.tax_amount}, ${quote.subtotal}, ${quote.total},
      ${quote.currency ?? "USD"}, ${quote.company ?? null},
      ${session.user.id}
    )
    RETURNING *
  `;
  const invoice = invRows[0] as any;

  // Copy items
  for (let i = 0; i < (qItems as any[]).length; i++) {
    const it = (qItems as any[])[i];
    await sql`
      INSERT INTO invoice_items (invoice_id, service_id, description, quantity, unit_price, total, position)
      VALUES (${invoice.id}, ${it.service_id ?? null}, ${it.description}, ${it.quantity}, ${it.unit_price}, ${it.total}, ${i})
    `;
  }

  // Mark quote as converted
  await sql`
    UPDATE quotes SET
      status = 'approved',
      converted_to_invoice_id = ${invoice.id},
      updated_at = now()
    WHERE id = ${id}
  `;

  return NextResponse.json({ invoice_id: invoice.id, invoice_number });
}
