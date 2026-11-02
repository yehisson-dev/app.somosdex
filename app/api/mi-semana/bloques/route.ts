import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { OWNER_EMAIL } from "@/lib/mi-semana-utils";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.email !== OWNER_EMAIL) return forbidden();
  const uid = session.user.id as string;

  const { dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden } = await req.json();
  const [row] = await sql`
    INSERT INTO ms_bloques (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, categoria_id, variante, orden)
    VALUES (${uid}, ${dia_semana}, ${hora_inicio}, ${hora_fin}, ${titulo}, ${categoria_id ?? null}, ${variante ?? 'todas'}, ${orden ?? 0})
    RETURNING id, dia_semana, to_char(hora_inicio,'HH24:MI') AS hora_inicio, to_char(hora_fin,'HH24:MI') AS hora_fin, titulo, categoria_id, variante, orden
  `;
  return NextResponse.json(row, { status: 201 });
}
