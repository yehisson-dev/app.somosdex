import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows, bank_account_id } = await req.json() as {
    rows: Array<{
      date: string;
      description: string;
      amount: number;
      type: "credit" | "debit";
      action: "expense" | "income" | "transfer" | "ignore";
      category_id: string | null;
      invoice_id: string | null;
      transfer_account_id: string | null;
      company: string;
      notes?: string;
    }>;
    bank_account_id?: string;
  };

  let expensesCreated = 0;
  let invoicesMarked  = 0;
  let ignored         = 0;

  for (const row of rows) {
    if (row.action === "ignore" || row.action === "transfer") { ignored++; continue; }

    if (row.action === "expense") {
      await sql`
        INSERT INTO expenses (date, company, description, amount, currency, type, category_id, bank_account_id, notes)
        VALUES (
          ${row.date}, ${row.company ?? "DEX"}, ${row.description},
          ${row.amount}, 'DOP', 'real',
          ${row.category_id ?? null},
          ${bank_account_id ?? null},
          ${row.notes ?? null}
        )
      `;
      expensesCreated++;
    }

    if (row.action === "income" && row.invoice_id) {
      // Insert a payment record and let recalcInvoiceStatus handle status
      const invRows = await sql`SELECT total, currency FROM invoices WHERE id = ${row.invoice_id} LIMIT 1`.catch(() => []);
      const inv = (invRows as any)[0];
      if (inv) {
        await sql`
          INSERT INTO invoice_payments (invoice_id, amount, currency, payment_date, bank_account_id, notes)
          VALUES (
            ${row.invoice_id},
            ${Number(inv.total)},
            ${inv.currency ?? "DOP"},
            ${row.date},
            ${bank_account_id ?? null},
            ${"Importado desde estado de cuenta"}
          )
        `.catch(() => null);
        // Recalc status
        const sumRows = await sql`SELECT COALESCE(SUM(amount),0) AS paid FROM invoice_payments WHERE invoice_id = ${row.invoice_id}`.catch(() => []);
        const paid  = Number((sumRows as any)[0]?.paid ?? 0);
        const total = Number(inv.total);
        const newStatus = paid >= total ? "paid" : paid > 0 ? "partially_paid" : "sent";
        await sql`UPDATE invoices SET status = ${newStatus}, updated_at = now() WHERE id = ${row.invoice_id}`.catch(() => null);
        invoicesMarked++;
      }
    }
  }

  return NextResponse.json({ expensesCreated, invoicesMarked, ignored });
}
