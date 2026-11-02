"use client";

import { useMemo } from "react";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { getPeriodoInicio } from "@/lib/mi-semana-utils";
import type { Bloque, Actividad, Subtarea, Completada, Categoria, Pendiente } from "./MiSemanaClient";

type Props = {
  categorias: Categoria[];
  bloques: Bloque[];
  actividades: Actividad[];
  subtareas: Subtarea[];
  completadas: Completada[];
  pendientes: Pendiente[];
  today: string;
  weekVariant: 'A' | 'B';
  onToggleSubtarea: (id: string, date: string) => void;
};

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function isCompletada(completadas: Completada[], subtarea: Subtarea, date: string) {
  const d = new Date(date + 'T12:00:00Z');
  const periodo = getPeriodoInicio(d, subtarea.frecuencia as 'semanal' | 'mensual' | 'trimestral');
  return completadas.some(c => c.subtarea_id === subtarea.id && c.periodo_inicio === periodo);
}

function shouldShowSubtarea(subtarea: Subtarea, date: string) {
  const d = new Date(date + 'T12:00:00Z');
  if (subtarea.frecuencia === 'semanal') return true;
  const periodo = getPeriodoInicio(d, subtarea.frecuencia as 'mensual' | 'trimestral');
  const weekStart = getPeriodoInicio(d, 'semanal');
  return periodo === weekStart;
}

export function VistaDia({ categorias, bloques, actividades, subtareas, completadas, pendientes, today, weekVariant, onToggleSubtarea }: Props) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayDate = new Date(today + 'T12:00:00Z');
  const dayOfWeek = todayDate.getUTCDay() === 0 ? 7 : todayDate.getUTCDay(); // 1=Mon…6=Sat

  const catMap = useMemo(() => Object.fromEntries(categorias.map(c => [c.id, c])), [categorias]);

  const todayBloques = useMemo(() =>
    bloques.filter(b => {
      if (b.dia_semana !== dayOfWeek) return false;
      if (b.variante === 'todas') return true;
      return b.variante === weekVariant;
    }).sort((a, b) => timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio)),
    [bloques, dayOfWeek, weekVariant]
  );

  // Pendientes asignados a bloques de hoy
  const pendientesPorBloque = useMemo(() => {
    const map: Record<string, Pendiente[]> = {};
    pendientes.filter(p => p.bloque_id && p.fecha_asignada === today && p.estado === 'pendiente').forEach(p => {
      if (!map[p.bloque_id!]) map[p.bloque_id!] = [];
      map[p.bloque_id!].push(p);
    });
    return map;
  }, [pendientes, today]);

  // Progress del día
  const allSt = useMemo(() => {
    const bloqueIds = new Set(todayBloques.map(b => b.id));
    const actIds = new Set(actividades.filter(a => bloqueIds.has(a.bloque_id)).map(a => a.id));
    return subtareas.filter(s => actIds.has(s.actividad_id) && shouldShowSubtarea(s, today));
  }, [todayBloques, actividades, subtareas, today]);

  const doneCount = allSt.filter(s => isCompletada(completadas, s, today)).length;
  const totalCount = allSt.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  if (todayBloques.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
        <p className="text-lg font-medium">Sin bloques hoy</p>
        <p className="text-sm">Descansa o agrega bloques desde la vista Semana.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
      {/* Day progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Progreso del día</span>
          <span className="font-medium text-gray-700">{doneCount}/{totalCount} subtareas · {pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-4">
        {todayBloques.map(bloque => {
          const cat = bloque.categoria_id ? catMap[bloque.categoria_id] : null;
          const bloqueActs = actividades.filter(a => a.bloque_id === bloque.id);
          const bloqueSts = subtareas.filter(s => bloqueActs.some(a => a.id === s.actividad_id) && shouldShowSubtarea(s, today));
          const bloqueDone = bloqueSts.filter(s => isCompletada(completadas, s, today)).length;
          const bloqueTotal = bloqueSts.length;
          const bloquePct = bloqueTotal > 0 ? Math.round((bloqueDone / bloqueTotal) * 100) : 0;

          const startMin = timeToMinutes(bloque.hora_inicio);
          const endMin = timeToMinutes(bloque.hora_fin);
          const isActive = today === new Date().toISOString().slice(0, 10) && nowMin >= startMin && nowMin < endMin;

          const extraPendientes = pendientesPorBloque[bloque.id] ?? [];

          return (
            <div
              key={bloque.id}
              className={`rounded-xl border bg-white shadow-sm overflow-hidden ${isActive ? 'ring-2 ring-violet-400' : ''}`}
              style={{ borderLeftWidth: 4, borderLeftColor: cat?.color ?? '#e5e7eb' }}
            >
              {/* Header */}
              <div className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">Ahora</span>
                    )}
                    {cat && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: cat.color }}>{cat.nombre}</span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 mt-0.5 text-sm">{bloque.titulo}</p>
                  <p className="text-xs text-gray-400">{bloque.hora_inicio} – {bloque.hora_fin}</p>
                </div>
                {bloqueTotal > 0 && (
                  <div className="text-right shrink-0">
                    <span className="text-xs font-medium text-gray-500">{bloqueDone}/{bloqueTotal}</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1">
                      <div className="h-full rounded-full transition-all" style={{ width: `${bloquePct}%`, backgroundColor: cat?.color ?? '#8b5cf6' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Subtareas */}
              {bloqueActs.map(act => {
                const actSts = subtareas.filter(s => s.actividad_id === act.id && shouldShowSubtarea(s, today));
                if (actSts.length === 0) return null;
                return (
                  <div key={act.id} className="px-4 pb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">{act.titulo}</p>
                    <ul className="space-y-1">
                      {actSts.map(st => {
                        const done = isCompletada(completadas, st, today);
                        return (
                          <li key={st.id}
                            className="flex items-start gap-2 cursor-pointer group"
                            onClick={() => onToggleSubtarea(st.id, today)}
                          >
                            {done
                              ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
                              : <Circle className="w-4 h-4 mt-0.5 shrink-0 text-gray-300 group-hover:text-gray-400" />
                            }
                            <span className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                              {st.titulo}
                              {st.frecuencia !== 'semanal' && (
                                <span className="ml-1 text-[10px] text-gray-400">({st.frecuencia})</span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}

              {/* Pendientes asignados */}
              {extraPendientes.length > 0 && (
                <div className="px-4 pb-3 border-t border-gray-100 pt-2">
                  <p className="text-xs font-medium text-orange-500 mb-1">Pendientes asignados</p>
                  <ul className="space-y-1">
                    {extraPendientes.map(p => (
                      <li key={p.id} className="flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-orange-400 shrink-0" />
                        <span className="text-sm text-gray-700">{p.titulo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
