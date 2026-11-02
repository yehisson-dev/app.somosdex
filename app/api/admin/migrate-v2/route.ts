import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function POST() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        type text NOT NULL DEFAULT 'bank',
        currency text NOT NULL DEFAULT 'DOP',
        color text DEFAULT '#6366f1',
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        color text DEFAULT '#6b7280',
        created_at timestamptz DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        date date NOT NULL,
        company text NOT NULL DEFAULT 'DEX',
        category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
        description text,
        amount numeric(12,2) NOT NULL DEFAULT 0,
        currency text NOT NULL DEFAULT 'DOP',
        bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
        type text NOT NULL DEFAULT 'real',
        attachment_url text,
        attachment_name text,
        notes text,
        created_at timestamptz DEFAULT now()
      )
    `;

    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company text DEFAULT 'DEX'`;
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS initial_balance numeric(12,2) DEFAULT 0`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_date date`;

    return NextResponse.json({ ok: true, message: "Migration v2 completed" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
