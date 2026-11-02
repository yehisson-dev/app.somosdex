import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

type Params = { params: Promise<{ paymentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { paymentId } = await params;

  // Get invoice_id before deleting
  const rows = await sql`SELECT invoice_id FROM invoice_payments WHERE id = ${paymentId} LIMIT 1`;
  if (!rows[0]) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const invoiceId = (rows[0] as any).invoice_id;

  await sql`DELETE FROM invoice_payments WHERE id = ${paymentId}`;

  // Recalculate invoice status
  const invRows = await sql`SELECT total FROM invoices WHERE id = ${invoiceId} LIMIT 1`;
  const total = Number((invRows[0] as any)?.total ?? 0);
  const sumRows = await sql`SELECT COALESCE(SUM(amount),0) AS paid FROM invoice_payments WHERE invoice_id = ${invoiceId}`;
  const paid = Number((sumRows[0] as any)?.paid ?? 0);

  const newStatus = paid <= 0 ? "sent" : paid >= total ? "paid" : "partially_paid";
  await sql`UPDATE invoices SET status = ${newStatus}, updated_at = now() WHERE id = ${invoiceId}`;

  return NextResponse.json({ ok: true, newStatus });
}
