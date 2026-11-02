import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { OWNER_EMAIL } from "@/lib/mi-semana-utils";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") return forbidden();
  const { id } = await params;
  const { titulo, orden } = await req.json();
  const [row] = await sql`
    UPDATE ms_actividades SET titulo = COALESCE(${titulo}, titulo), orden = COALESCE(${orden ?? null}, orden)
    WHERE id = ${id} RETURNING *
  `;
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") return forbidden();
  const { id } = await params;
  await sql`DELETE FROM ms_actividades WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
