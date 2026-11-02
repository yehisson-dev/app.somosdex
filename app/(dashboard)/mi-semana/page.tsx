import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { MiSemanaClient } from "@/components/mi-semana/MiSemanaClient";
import { getWeekVariant, getPeriodoInicio, OWNER_EMAIL } from "@/lib/mi-semana-utils";

export const dynamic = "force-dynamic";

export default async function MiSemanaPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session?.user as any)?.role !== "admin") notFound();

  const now = new Date();
  const variant = getWeekVariant(now);
  const periodoSemanal = getPeriodoInicio(now, 'semanal');
  const periodoMensual = getPeriodoInicio(now, 'mensual');
  const periodoTrimestral = getPeriodoInicio(now, 'trimestral');

  const [categorias, bloques, actividades, subtareas, completadas, pendientes] = await Promise.all([
    sql`SELECT * FROM ms_categorias ORDER BY nombre`,
    sql`SELECT id, dia_semana, to_char(hora_inicio,'HH24:MI') AS hora_inicio, to_char(hora_fin,'HH24:MI') AS hora_fin, titulo, categoria_id, variante, orden FROM ms_bloques ORDER BY dia_semana, orden`,
    sql`SELECT * FROM ms_actividades ORDER BY bloque_id, orden`,
    sql`SELECT * FROM ms_subtareas ORDER BY actividad_id, orden`,
    sql`
      SELECT subtarea_id, periodo_inicio::text FROM ms_subtareas_completadas
      WHERE usuario_id = (SELECT id FROM users WHERE email = ${OWNER_EMAIL} LIMIT 1)
        AND periodo_inicio IN (${periodoSemanal}, ${periodoMensual}, ${periodoTrimestral})
    `,
    sql`SELECT p.*, to_char(p.fecha_limite,'YYYY-MM-DD') AS fecha_limite, to_char(p.fecha_asignada,'YYYY-MM-DD') AS fecha_asignada FROM ms_pendientes p ORDER BY p.creado_en DESC`,
  ]);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Mi semana" subtitle={`Semana ${variant} · ${now.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}`} />
      <MiSemanaClient
        initialCategorias={categorias as any[]}
        initialBloques={bloques as any[]}
        initialActividades={actividades as any[]}
        initialSubtareas={subtareas as any[]}
        initialCompletadas={completadas as any[]}
        initialPendientes={pendientes as any[]}
        today={now.toISOString().slice(0, 10)}
        weekVariant={variant}
      />
    </div>
  );
}
