import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { OWNER_EMAIL } from "@/lib/mi-semana-utils";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.email !== OWNER_EMAIL) return forbidden();
  const { id } = await params;

  const body = await req.json();
  const fields = Object.entries(body)
    .filter(([k]) => ['dia_semana','hora_inicio','hora_fin','titulo','categoria_id','variante','orden'].includes(k));
  if (!fields.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const setClauses = fields.map(([k], i) => `"${k}" = $${i + 2}`).join(', ');
  const values = [id, ...fields.map(([, v]) => v)];
  const rows = await sql.unsafe(
    `UPDATE ms_bloques SET ${setClauses} WHERE id = $1 RETURNING id`, values
  );
  return NextResponse.json(rows[0] ?? {});
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.email !== OWNER_EMAIL) return forbidden();
  const { id } = await params;
  await sql`DELETE FROM ms_bloques WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
