import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { OWNER_EMAIL, getPeriodoInicio } from "@/lib/mi-semana-utils";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.email !== OWNER_EMAIL) return forbidden();

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const date = new Date(dateStr + "T12:00:00Z");

  // Fetch all data in parallel
  const [categorias, bloques, actividades, subtareas, completadas, pendientes] = await Promise.all([
    sql`SELECT * FROM ms_categorias ORDER BY nombre`,
    sql`SELECT id, dia_semana, to_char(hora_inicio,'HH24:MI') AS hora_inicio, to_char(hora_fin,'HH24:MI') AS hora_fin, titulo, categoria_id, variante, orden FROM ms_bloques ORDER BY dia_semana, orden`,
    sql`SELECT * FROM ms_actividades ORDER BY bloque_id, orden`,
    sql`SELECT * FROM ms_subtareas ORDER BY actividad_id, orden`,
    sql`
      SELECT sc.subtarea_id, sc.periodo_inicio::text
      FROM ms_subtareas_completadas sc
      JOIN ms_subtareas st ON st.id = sc.subtarea_id
      WHERE sc.usuario_id = (SELECT id FROM users WHERE email = ${OWNER_EMAIL} LIMIT 1)
        AND sc.periodo_inicio IN (
          ${getPeriodoInicio(date, 'semanal')},
          ${getPeriodoInicio(date, 'mensual')},
          ${getPeriodoInicio(date, 'trimestral')}
        )
    `,
    sql`SELECT p.*, to_char(p.fecha_limite,'YYYY-MM-DD') AS fecha_limite, to_char(p.fecha_asignada,'YYYY-MM-DD') AS fecha_asignada FROM ms_pendientes p ORDER BY p.creado_en DESC`,
  ]);

  return NextResponse.json({ categorias, bloques, actividades, subtareas, completadas, pendientes });
}
