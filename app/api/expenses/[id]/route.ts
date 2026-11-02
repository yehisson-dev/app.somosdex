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

  const [expense] = await sql`
    UPDATE expenses SET
      date            = ${b.date}::date,
      company         = ${b.company},
      category_id     = ${b.category_id ?? null},
      description     = ${b.description ?? null},
      amount          = ${b.amount},
      currency        = ${b.currency ?? "DOP"},
      bank_account_id = ${b.bank_account_id ?? null},
      type            = ${b.type ?? "real"},
      attachment_url  = ${b.attachment_url ?? null},
      attachment_name = ${b.attachment_name ?? null},
      notes           = ${b.notes ?? null}
    WHERE id = ${id}
    RETURNING *, to_char(date, 'YYYY-MM-DD') AS date
  `;
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(expense);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await sql`DELETE FROM expenses WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
