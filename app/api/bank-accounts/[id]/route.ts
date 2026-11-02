import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const b = await req.json();

  const [bank] = await sql`
    UPDATE bank_accounts SET
      name            = COALESCE(${b.name            ?? null}, name),
      type            = COALESCE(${b.type            ?? null}, type),
      currency        = COALESCE(${b.currency        ?? null}, currency),
      color           = COALESCE(${b.color           ?? null}, color),
      initial_balance = COALESCE(${b.initial_balance ?? null}, initial_balance)
    WHERE id = ${id}
    RETURNING *
  `;
  return NextResponse.json(bank ?? { error: "Not found" });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await sql`UPDATE bank_accounts SET is_active = false WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
