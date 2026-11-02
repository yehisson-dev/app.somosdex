"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, CheckCircle2, Circle } from "lucide-react";
import { getMonday, getPeriodoInicio } from "@/lib/mi-semana-utils";
import type { Bloque, Actividad, Subtarea, Completada, Categoria } from "./MiSemanaClient";

type Props = {
  categorias: Categoria[];
  bloques: Bloque[];
  actividades: Actividad[];
  subtareas: Subtarea[];
  completadas: Completada[];
  viewDate: string;
  viewVariant: 'A' | 'B';
  today: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToggleVariant: () => void;
  onToggleSubtarea: (id: string, date: string) => void;
};

const GRID_START = 7 * 60 + 30; // 07:30
const GRID_END = 18 * 60;       // 18:00
const GRID_MINS = GRID_END - GRID_START; // 630

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function topPct(start: string) {
  const m = Math.max(timeToMinutes(start), GRID_START);
  return ((m - GRID_START) / GRID_MINS) * 100;
}

function heightPct(start: string, end: string) {
  const s = Math.max(timeToMinutes(start), GRID_START);
  const e = Math.min(timeToMinutes(end), GRID_END);
  return Math.max(((e - s) / GRID_MINS) * 100, 2);
}

function isCompletada(completadas: Completada[], subtarea: Subtarea, date: string) {
  const d = new Date(date + 'T12:00:00Z');
  const periodo = getPeriodoInicio(d, subtarea.frecuencia as any);
  return completadas.some(c => c.subtarea_id === subtarea.id && c.periodo_inicio === periodo);
}

function shouldShow(st: Subtarea, date: string) {
  const d = new Date(date + 'T12:00:00Z');
  if (st.frecuencia === 'semanal') return true;
  return getPeriodoInicio(d, st.frecuencia as any) === getPeriodoInicio(d, 'semanal');
}

const CAT_COLORS: Record<string, string> = {
  'CEO': '#8E24AA', 'Dex': '#3F51B5', 'Cubo': '#F4511E',
  'Rhina': '#0B8043', 'Contenido': '#F6BF26', 'Tecnología': '#616161',
};

export function VistaSemana({
  categorias, bloques, actividades, subtareas, completadas,
  viewDate, viewVariant, today, onPrevWeek, onNextWeek, onToggleVariant, onToggleSubtarea,
}: Props) {
  const [selectedBloque, setSelectedBloque] = useState<Bloque | null>(null);
  const [mobileDay, setMobileDay] = useState<number>(() => {
    const d = new Date(today + 'T12:00:00Z');
    const dow = d.getUTCDay();
    return dow === 0 ? 6 : dow - 1; // 0-based index
  });

  const monday = getMonday(new Date(viewDate + 'T12:00:00Z'));
  const weekDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const catMap = useMemo(() => Object.fromEntries(categorias.map(c => [c.id, c])), [categorias]);

  const bloquesForDay = (dayIdx: number) => {
    const dayNum = dayIdx + 1;
    return bloques.filter(b => {
      if (b.dia_semana !== dayNum) return false;
      if (b.variante === 'todas') return true;
      return b.variante === viewVariant;
    });
  };

  const selectedActs = selectedBloque ? actividades.filter(a => a.bloque_id === selectedBloque.id) : [];
  const selectedDate = selectedBloque
    ? weekDates[selectedBloque.dia_semana - 1] ?? today
    : today;

  const hourLabels = [];
  for (let m = GRID_START; m <= GRID_END; m += 60) {
    const h = Math.floor(m / 60);
    hourLabels.push(`${h}:00`);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main grid */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">
          <button onClick={onPrevWeek} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-gray-700 min-w-40 text-center">
            {monday.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })} –{' '}
            {weekDates[5] && new Date(weekDates[5] + 'T12:00:00Z').toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button onClick={onNextWeek} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></button>
          <button
            onClick={onToggleVariant}
            className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full border border-violet-300 text-violet-700 hover:bg-violet-50"
          >
            Semana {viewVariant}
          </button>
        </div>

        {/* Mobile: day tabs */}
        <div className="md:hidden flex overflow-x-auto gap-1 px-2 py-2 border-b border-gray-100">
          {DAYS.map((d, i) => (
            <button key={i} onClick={() => setMobileDay(i)}
              className={`shrink-0 px-3 py-1 text-xs rounded-full font-medium ${
                mobileDay === i ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
              } ${weekDates[i] === today ? 'ring-2 ring-violet-400' : ''}`}
            >
              {d} {new Date(weekDates[i] + 'T12:00:00Z').getUTCDate()}
            </button>
          ))}
        </div>

        {/* Desktop grid */}
        <div className="hidden md:flex min-w-0">
          {/* Time axis */}
          <div className="w-14 shrink-0 relative" style={{ height: 800 }}>
            {hourLabels.map((label, i) => (
              <div key={i} className="absolute right-2 text-[10px] text-gray-400 -translate-y-2"
                style={{ top: `${(i / (hourLabels.length - 1)) * 100}%` }}>
                {label}
              </div>
            ))}
          </div>
          {/* Day columns */}
          {DAYS.map((day, dayIdx) => (
            <div key={dayIdx} className="flex-1 border-l border-gray-100 min-w-0">
              <div className={`text-center py-1 text-xs font-medium border-b border-gray-100 ${weekDates[dayIdx] === today ? 'text-violet-600' : 'text-gray-500'}`}>
                {day} {new Date(weekDates[dayIdx] + 'T12:00:00Z').getUTCDate()}
              </div>
              <div className="relative" style={{ height: 800 }}>
                {/* Hour lines */}
                {hourLabels.map((_, i) => (
                  <div key={i} className="absolute w-full border-t border-gray-50"
                    style={{ top: `${(i / (hourLabels.length - 1)) * 100}%` }} />
                ))}
                {/* Blocks */}
                {bloquesForDay(dayIdx).map(b => {
                  const cat = b.categoria_id ? catMap[b.categoria_id] : null;
                  const top = topPct(b.hora_inicio);
                  const height = heightPct(b.hora_inicio, b.hora_fin);
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBloque(b === selectedBloque ? null : b)}
                      className="absolute left-0.5 right-0.5 rounded text-left overflow-hidden hover:brightness-95 transition-all text-[10px] px-1 py-0.5"
                      style={{
                        top: `${top}%`, height: `${height}%`,
                        backgroundColor: (cat?.color ?? '#8b5cf6') + '22',
                        borderLeft: `3px solid ${cat?.color ?? '#8b5cf6'}`,
                      }}
                    >
                      <span className="font-semibold leading-tight block truncate" style={{ color: cat?.color ?? '#6b7280' }}>
                        {b.titulo}
                      </span>
                      <span className="text-gray-400">{b.hora_inicio}–{b.hora_fin}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile single day */}
        <div className="md:hidden p-4 space-y-3">
          {bloquesForDay(mobileDay).length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">Sin bloques este día</p>
          )}
          {bloquesForDay(mobileDay).sort((a, b) => timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio)).map(b => {
            const cat = b.categoria_id ? catMap[b.categoria_id] : null;
            return (
              <button key={b.id} onClick={() => setSelectedBloque(b === selectedBloque ? null : b)}
                className="w-full text-left rounded-xl border bg-white p-3 shadow-sm"
                style={{ borderLeftWidth: 4, borderLeftColor: cat?.color ?? '#e5e7eb' }}>
                <p className="font-semibold text-sm text-gray-900">{b.titulo}</p>
                <p className="text-xs text-gray-400">{b.hora_inicio} – {b.hora_fin}</p>
              </button>
            );
          })}
        </div>

        {/* Category legend */}
        <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-gray-100">
          {categorias.map(c => (
            <div key={c.id} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="text-xs text-gray-500">{c.nombre}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Side panel */}
      {selectedBloque && (
        <div className="w-72 shrink-0 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">
          <div className="flex items-start justify-between p-4 border-b border-gray-100">
            <div>
              <p className="font-semibold text-sm text-gray-900">{selectedBloque.titulo}</p>
              <p className="text-xs text-gray-400">{selectedBloque.hora_inicio} – {selectedBloque.hora_fin}</p>
            </div>
            <button onClick={() => setSelectedBloque(null)} className="p-1 hover:bg-gray-100 rounded ml-2 shrink-0">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedActs.map(act => {
              const actSts = subtareas.filter(s => s.actividad_id === act.id && shouldShow(s, selectedDate));
              return (
                <div key={act.id}>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">{act.titulo}</p>
                  <ul className="space-y-1.5">
                    {actSts.map(st => {
                      const done = isCompletada(completadas, st, selectedDate);
                      return (
                        <li key={st.id}
                          className="flex items-start gap-2 cursor-pointer group"
                          onClick={() => onToggleSubtarea(st.id, selectedDate)}
                        >
                          {done
                            ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
                            : <Circle className="w-4 h-4 mt-0.5 shrink-0 text-gray-300 group-hover:text-gray-400" />
                          }
                          <span className={`text-xs ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{st.titulo}</span>
                        </li>
                      );
                    })}
                    {actSts.length === 0 && <li className="text-xs text-gray-400">Sin subtareas visibles esta semana</li>}
                  </ul>
                </div>
              );
            })}
            {selectedActs.length === 0 && <p className="text-xs text-gray-400">Sin actividades en este bloque</p>}
          </div>
        </div>
      )}
    </div>
  );
}
