import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banks = await sql`
    SELECT
      ba.id, ba.name, ba.type, ba.currency, ba.color, ba.is_active,
      COALESCE(ba.initial_balance, 0) AS initial_balance,
      COALESCE(SUM(CASE WHEN i.currency = 'USD' AND i.status = 'paid' THEN i.total ELSE 0 END), 0) AS received_usd,
      COALESCE(SUM(CASE WHEN i.currency = 'DOP' AND i.status = 'paid' THEN i.total ELSE 0 END), 0) AS received_dop
    FROM bank_accounts ba
    LEFT JOIN invoices i ON i.bank_account_id = ba.id
    WHERE ba.is_active = true
    GROUP BY ba.id
    ORDER BY ba.name
  `;
  return NextResponse.json(banks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, type, currency, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const [bank] = await sql`
    INSERT INTO bank_accounts (name, type, currency, color)
    VALUES (${name.trim()}, ${type ?? "bank"}, ${currency ?? "DOP"}, ${color ?? "#6366f1"})
    RETURNING *, 0::numeric AS received_usd, 0::numeric AS received_dop
  `;
  return NextResponse.json(bank, { status: 201 });
}
