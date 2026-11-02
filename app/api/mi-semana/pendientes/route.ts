import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { OWNER_EMAIL } from "@/lib/mi-semana-utils";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function GET() {
  const session = await auth();
  if (session?.user?.email !== OWNER_EMAIL) return forbidden();
  const rows = await sql`
    SELECT p.*, to_char(p.fecha_limite,'YYYY-MM-DD') AS fecha_limite, to_char(p.fecha_asignada,'YYYY-MM-DD') AS fecha_asignada
    FROM ms_pendientes p ORDER BY p.creado_en DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.email !== OWNER_EMAIL) return forbidden();
  const uid = session.user.id as string;
  const { titulo, nota, categoria_id, fecha_limite, bloque_id, fecha_asignada } = await req.json();
  const [row] = await sql`
    INSERT INTO ms_pendientes (usuario_id, titulo, nota, categoria_id, fecha_limite, bloque_id, fecha_asignada)
    VALUES (${uid}, ${titulo}, ${nota ?? null}, ${categoria_id ?? null}, ${fecha_limite ?? null}, ${bloque_id ?? null}, ${fecha_asignada ?? null})
    RETURNING *, to_char(fecha_limite,'YYYY-MM-DD') AS fecha_limite, to_char(fecha_asignada,'YYYY-MM-DD') AS fecha_asignada
  `;
  return NextResponse.json(row, { status: 201 });
}
