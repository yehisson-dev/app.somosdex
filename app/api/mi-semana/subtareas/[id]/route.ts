import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { OWNER_EMAIL } from "@/lib/mi-semana-utils";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") return forbidden();
  const { id } = await params;
  const { titulo, frecuencia, orden } = await req.json();
  const [row] = await sql`
    UPDATE ms_subtareas
    SET titulo     = COALESCE(${titulo ?? null},    titulo),
        frecuencia = COALESCE(${frecuencia ?? null}, frecuencia),
        orden      = COALESCE(${orden ?? null},      orden)
    WHERE id = ${id} RETURNING *
  `;
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") return forbidden();
  const { id } = await params;
  await sql`DELETE FROM ms_subtareas WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
