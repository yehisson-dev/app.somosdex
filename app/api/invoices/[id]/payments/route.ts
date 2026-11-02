import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET — list payments for an invoice
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const payments = await sql`
    SELECT
      p.id, p.amount, p.currency, p.reference, p.notes,
      to_char(p.payment_date, 'YYYY-MM-DD') AS payment_date,
      to_char(p.created_at,   'YYYY-MM-DD') AS created_at,
      CASE WHEN ba.id IS NOT NULL
        THEN json_build_object('id', ba.id, 'name', ba.name)
      END AS bank_account
    FROM invoice_payments p
    LEFT JOIN bank_accounts ba ON ba.id = p.bank_account_id
    WHERE p.invoice_id = ${id}
    ORDER BY p.payment_date DESC, p.created_at DESC
  `;
  return NextResponse.json(payments);
}

// POST — register a payment and update invoice status
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { amount, currency, payment_date, bank_account_id, reference, notes } = body;

  if (!amount || Number(amount) <= 0)
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });

  // Insert payment
  const rows = await sql`
    INSERT INTO invoice_payments (invoice_id, amount, currency, payment_date, bank_account_id, reference, notes, created_by)
    VALUES (
      ${id}, ${Number(amount)}, ${currency ?? "USD"},
      ${payment_date ?? new Date().toISOString().split("T")[0]},
      ${bank_account_id ?? null}, ${reference ?? null}, ${notes ?? null},
      ${session.user.id}
    )
    RETURNING *
  `;
  const payment = rows[0] as any;

  // Recalculate invoice status based on total payments
  await recalcInvoiceStatus(id);

  return NextResponse.json(payment, { status: 201 });
}

// Helper: update invoice status based on payments sum
async function recalcInvoiceStatus(invoiceId: string) {
  const invRows = await sql`SELECT total, status FROM invoices WHERE id = ${invoiceId} LIMIT 1`;
  const inv = invRows[0] as any;
  if (!inv) return;

  const sumRows = await sql`
    SELECT COALESCE(SUM(amount), 0) AS paid FROM invoice_payments WHERE invoice_id = ${invoiceId}
  `;
  const paid = Number((sumRows[0] as any)?.paid ?? 0);
  const total = Number(inv.total);

  let newStatus: string;
  if (paid <= 0) {
    newStatus = inv.status === "paid" || inv.status === "partially_paid" ? "sent" : inv.status;
  } else if (paid >= total) {
    newStatus = "paid";
  } else {
    newStatus = "partially_paid";
  }

  await sql`UPDATE invoices SET status = ${newStatus}, updated_at = now() WHERE id = ${invoiceId}`;
}
