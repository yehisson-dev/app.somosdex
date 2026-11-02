"use client";

import { useState, useCallback } from "react";
import { VistaDia } from "./VistaDia";
import { VistaSemana } from "./VistaSemana";
import { PendientesPanel } from "./PendientesPanel";
import { getWeekVariant, getMonday } from "@/lib/mi-semana-utils";

export type Categoria = { id: string; nombre: string; color: string };
export type Bloque = {
  id: string; dia_semana: number; hora_inicio: string; hora_fin: string;
  titulo: string; categoria_id: string | null; variante: string; orden: number;
};
export type Actividad = { id: string; bloque_id: string; titulo: string; orden: number };
export type Subtarea = { id: string; actividad_id: string; titulo: string; frecuencia: string; orden: number };
export type Completada = { subtarea_id: string; periodo_inicio: string };
export type Pendiente = {
  id: string; titulo: string; nota: string | null; categoria_id: string | null;
  fecha_limite: string | null; estado: string; bloque_id: string | null; fecha_asignada: string | null;
  creado_en: string;
};

type Props = {
  initialCategorias: Categoria[];
  initialBloques: Bloque[];
  initialActividades: Actividad[];
  initialSubtareas: Subtarea[];
  initialCompletadas: Completada[];
  initialPendientes: Pendiente[];
  today: string;
  weekVariant: 'A' | 'B';
};

type Tab = 'hoy' | 'semana' | 'pendientes';

export function MiSemanaClient({
  initialCategorias, initialBloques, initialActividades, initialSubtareas,
  initialCompletadas, initialPendientes, today, weekVariant,
}: Props) {
  const [tab, setTab] = useState<Tab>('hoy');
  const [categorias] = useState(initialCategorias);
  const [bloques, setBloques] = useState(initialBloques);
  const [actividades, setActividades] = useState(initialActividades);
  const [subtareas, setSubtareas] = useState(initialSubtareas);
  const [completadas, setCompletadas] = useState(initialCompletadas);
  const [pendientes, setPendientes] = useState(initialPendientes);

  // Navigate weeks for VistaSemana
  const [viewDate, setViewDate] = useState(today);
  const viewVariant = getWeekVariant(new Date(viewDate + 'T12:00:00Z'));

  const prevWeek = () => {
    const d = new Date(viewDate + 'T12:00:00Z');
    d.setDate(d.getDate() - 7);
    setViewDate(d.toISOString().slice(0, 10));
  };
  const nextWeek = () => {
    const d = new Date(viewDate + 'T12:00:00Z');
    d.setDate(d.getDate() + 7);
    setViewDate(d.toISOString().slice(0, 10));
  };
  const toggleVariant = () => {
    // Jump to the nearest week of the other variant
    const d = new Date(viewDate + 'T12:00:00Z');
    d.setDate(d.getDate() + 7);
    setViewDate(d.toISOString().slice(0, 10));
  };

  const toggleSubtarea = useCallback(async (subtareaId: string, date: string) => {
    const res = await fetch(`/api/mi-semana/subtareas/${subtareaId}/toggle`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    const { completada, periodo } = await res.json();
    setCompletadas(prev =>
      completada
        ? [...prev, { subtarea_id: subtareaId, periodo_inicio: periodo }]
        : prev.filter(c => !(c.subtarea_id === subtareaId && c.periodo_inicio === periodo))
    );
  }, []);

  const addPendiente = useCallback(async (titulo: string) => {
    const res = await fetch('/api/mi-semana/pendientes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo }),
    });
    const row = await res.json();
    setPendientes(prev => [row, ...prev]);
  }, []);

  const updatePendiente = useCallback(async (id: string, patch: Partial<Pendiente>) => {
    const res = await fetch(`/api/mi-semana/pendientes/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const row = await res.json();
    setPendientes(prev => prev.map(p => p.id === id ? row : p));
  }, []);

  const deletePendiente = useCallback(async (id: string) => {
    await fetch(`/api/mi-semana/pendientes/${id}`, { method: 'DELETE' });
    setPendientes(prev => prev.filter(p => p.id !== id));
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'semana', label: 'Semana' },
    { key: 'pendientes', label: `Pendientes${pendientes.filter(p => p.estado === 'pendiente').length > 0 ? ` (${pendientes.filter(p => p.estado === 'pendiente').length})` : ''}` },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-gray-200 bg-white">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              tab === t.key
                ? 'bg-white border border-b-white border-gray-200 text-gray-900 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'hoy' && (
          <VistaDia
            categorias={categorias}
            bloques={bloques}
            actividades={actividades}
            subtareas={subtareas}
            completadas={completadas}
            pendientes={pendientes}
            today={today}
            weekVariant={weekVariant}
            onToggleSubtarea={toggleSubtarea}
          />
        )}
        {tab === 'semana' && (
          <VistaSemana
            categorias={categorias}
            bloques={bloques}
            actividades={actividades}
            subtareas={subtareas}
            completadas={completadas}
            viewDate={viewDate}
            viewVariant={viewVariant}
            today={today}
            onPrevWeek={prevWeek}
            onNextWeek={nextWeek}
            onToggleVariant={toggleVariant}
            onToggleSubtarea={toggleSubtarea}
          />
        )}
        {tab === 'pendientes' && (
          <PendientesPanel
            categorias={categorias}
            bloques={bloques}
            pendientes={pendientes}
            onAdd={addPendiente}
            onUpdate={updatePendiente}
            onDelete={deletePendiente}
          />
        )}
      </div>
    </div>
  );
}
