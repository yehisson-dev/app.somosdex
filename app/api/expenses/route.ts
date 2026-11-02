import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expenses = await sql`
    SELECT
      e.id, e.company, e.description, e.amount, e.currency, e.type,
      e.attachment_url, e.attachment_name, e.notes, e.category_id, e.bank_account_id,
      to_char(e.date, 'YYYY-MM-DD') AS date,
      CASE WHEN ec.id IS NOT NULL
        THEN json_build_object('id', ec.id, 'name', ec.name, 'color', ec.color)
      END AS category,
      CASE WHEN ba.id IS NOT NULL
        THEN json_build_object('id', ba.id, 'name', ba.name, 'type', ba.type)
      END AS bank_account
    FROM expenses e
    LEFT JOIN expense_categories ec ON ec.id = e.category_id
    LEFT JOIN bank_accounts ba ON ba.id = e.bank_account_id
    ORDER BY e.date DESC, e.created_at DESC
  `;
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { date, company, category_id, description, amount, currency, bank_account_id, type, attachment_url, attachment_name, notes } = await req.json();

  if (!date || !company || amount === undefined)
    return NextResponse.json({ error: "date, company, amount required" }, { status: 400 });

  const rows = await sql`
    INSERT INTO expenses (date, company, category_id, description, amount, currency, bank_account_id, type, attachment_url, attachment_name, notes)
    VALUES (
      ${date}::date, ${company}, ${category_id ?? null}, ${description ?? null},
      ${amount}, ${currency ?? "DOP"}, ${bank_account_id ?? null},
      ${type ?? "real"}, ${attachment_url ?? null}, ${attachment_name ?? null}, ${notes ?? null}
    )
    RETURNING *, to_char(date, 'YYYY-MM-DD') AS date
  `;
  const expense = rows[0] as any;

  if (expense.category_id) {
    const [cat] = await sql`SELECT id, name, color FROM expense_categories WHERE id = ${expense.category_id}`;
    expense.category = cat ?? null;
  }
  if (expense.bank_account_id) {
    const [ba] = await sql`SELECT id, name, type FROM bank_accounts WHERE id = ${expense.bank_account_id}`;
    expense.bank_account = ba ?? null;
  }

  return NextResponse.json(expense, { status: 201 });
}
