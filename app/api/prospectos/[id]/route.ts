import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

function adminOnly(session: any) {
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

// PATCH — actualizar prospecto (incluyendo cambio de stage desde el pipeline)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const err = adminOnly(session);
  if (err) return err;

  const { id } = await params;
  const body = await req.json();

  const allowed = ["name","company","email","phone","stage","value","currency","notes","source","assigned_to","expected_close"];
  const fields = Object.entries(body).filter(([k]) => allowed.includes(k));
  if (fields.length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  const setClauses = fields.map(([k], i) => `"${k}" = $${i + 2}`).join(", ");
  const values = [id, ...fields.map(([, v]) => v)];

  const rows = await sql.unsafe(
    `UPDATE prospects SET ${setClauses}, updated_at = now() WHERE id = $1 RETURNING *, to_char(expected_close, 'YYYY-MM-DD') AS expected_close`,
    values
  );

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}

// DELETE — eliminar prospecto
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const err = adminOnly(session);
  if (err) return err;

  const { id } = await params;
  await sql`DELETE FROM prospects WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
