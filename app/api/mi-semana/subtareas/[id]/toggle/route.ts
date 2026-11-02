import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { OWNER_EMAIL, getPeriodoInicio } from "@/lib/mi-semana-utils";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.email !== OWNER_EMAIL) return forbidden();
  const uid = session.user.id as string;
  const { id } = await params;
  const { date } = await req.json(); // ISO date string YYYY-MM-DD

  const [st] = await sql`SELECT frecuencia FROM ms_subtareas WHERE id = ${id}`;
  if (!st) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dateObj = new Date(date + "T12:00:00Z");
  const periodo = getPeriodoInicio(dateObj, st.frecuencia as 'semanal' | 'mensual' | 'trimestral');

  const [existing] = await sql`
    SELECT id FROM ms_subtareas_completadas
    WHERE subtarea_id = ${id} AND usuario_id = ${uid} AND periodo_inicio = ${periodo}
  `;

  if (existing) {
    await sql`DELETE FROM ms_subtareas_completadas WHERE id = ${existing.id}`;
    return NextResponse.json({ completada: false, periodo });
  } else {
    await sql`
      INSERT INTO ms_subtareas_completadas (subtarea_id, usuario_id, periodo_inicio)
      VALUES (${id}, ${uid}, ${periodo})
      ON CONFLICT DO NOTHING
    `;
    return NextResponse.json({ completada: true, periodo });
  }
}
