import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { OWNER_EMAIL } from "@/lib/mi-semana-utils";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") return forbidden();
  const { id } = await params;
  const { titulo, nota, categoria_id, fecha_limite, estado, bloque_id, fecha_asignada } = await req.json();
  const [row] = await sql`
    UPDATE ms_pendientes SET
      titulo         = COALESCE(${titulo ?? null},        titulo),
      nota           = COALESCE(${nota ?? null},           nota),
      categoria_id   = COALESCE(${categoria_id ?? null},   categoria_id),
      fecha_limite   = COALESCE(${fecha_limite ?? null},   fecha_limite),
      estado         = COALESCE(${estado ?? null},         estado),
      bloque_id      = COALESCE(${bloque_id ?? null},      bloque_id),
      fecha_asignada = COALESCE(${fecha_asignada ?? null}, fecha_asignada)
    WHERE id = ${id}
    RETURNING *, to_char(fecha_limite,'YYYY-MM-DD') AS fecha_limite, to_char(fecha_asignada,'YYYY-MM-DD') AS fecha_asignada
  `;
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") return forbidden();
  const { id } = await params;
  await sql`DELETE FROM ms_pendientes WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
