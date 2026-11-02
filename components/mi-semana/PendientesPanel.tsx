"use client";

import { useState, useRef } from "react";
import { Plus, CheckCircle2, Circle, Trash2, ChevronDown } from "lucide-react";
import type { Bloque, Categoria, Pendiente } from "./MiSemanaClient";

type Props = {
  categorias: Categoria[];
  bloques: Bloque[];
  pendientes: Pendiente[];
  onAdd: (titulo: string) => void;
  onUpdate: (id: string, patch: Partial<Pendiente>) => void;
  onDelete: (id: string) => void;
};

const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function PendientesPanel({ categorias, bloques, pendientes, onAdd, onUpdate, onDelete }: Props) {
  const [newText, setNewText] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterState, setFilterState] = useState<'all' | 'pendiente' | 'hecho'>('pendiente');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const catMap = Object.fromEntries(categorias.map(c => [c.id, c]));

  const filtered = pendientes.filter(p => {
    if (filterCat !== 'all' && p.categoria_id !== filterCat) return false;
    if (filterState !== 'all' && p.estado !== filterState) return false;
    return true;
  });

  const handleAdd = () => {
    const t = newText.trim();
    if (!t) return;
    onAdd(t);
    setNewText('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Add bar */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="Agregar pendiente y presionar Enter…"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-2 flex gap-2 flex-wrap border-b border-gray-100 bg-white">
        <select
          className="text-xs border border-gray-200 rounded-md px-2 py-1"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="all">Todas las marcas</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        {(['all', 'pendiente', 'hecho'] as const).map(s => (
          <button key={s}
            onClick={() => setFilterState(s)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${filterState === s ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {s === 'all' ? 'Todo' : s === 'pendiente' ? 'Pendientes' : 'Hechos'}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} items</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">Sin pendientes</p>
        )}
        {filtered.map(p => {
          const cat = p.categoria_id ? catMap[p.categoria_id] : null;
          const isDone = p.estado === 'hecho';
          const isEdit = editing === p.id;

          return (
            <div key={p.id}
              className="group rounded-xl border border-gray-100 bg-white p-3 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => onUpdate(p.id, { estado: isDone ? 'pendiente' : 'hecho' })}
                  className="mt-0.5 shrink-0"
                >
                  {isDone
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <Circle className="w-4 h-4 text-gray-300 hover:text-gray-400" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {p.titulo}
                  </p>
                  {p.nota && <p className="text-xs text-gray-400 mt-0.5">{p.nota}</p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {cat && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: cat.color + '22', color: cat.color }}>
                        {cat.nombre}
                      </span>
                    )}
                    {p.fecha_limite && (
                      <span className="text-[10px] text-gray-400">
                        Límite: {new Date(p.fecha_limite + 'T12:00:00Z').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {p.bloque_id && (
                      <span className="text-[10px] text-violet-500">
                        → {bloques.find(b => b.id === p.bloque_id)?.titulo?.slice(0, 25) ?? 'Bloque'}
                        {p.fecha_asignada && ` (${DIAS[bloques.find(b => b.id === p.bloque_id)?.dia_semana ?? 0]})`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => setEditing(isEdit ? null : p.id)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isEdit ? 'rotate-180' : ''}`} />
                  </button>
                  {confirmDelete === p.id ? (
                    <>
                      <button onClick={() => { onDelete(p.id); setConfirmDelete(null); }}
                        className="text-[10px] px-2 py-0.5 bg-red-500 text-white rounded hover:bg-red-600">Borrar</button>
                      <button onClick={() => setConfirmDelete(null)}
                        className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">No</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(p.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded edit */}
              {isEdit && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium">Marca</label>
                    <select
                      className="w-full mt-0.5 text-xs border border-gray-200 rounded px-2 py-1"
                      value={p.categoria_id ?? ''}
                      onChange={e => onUpdate(p.id, { categoria_id: e.target.value || null })}
                    >
                      <option value="">Sin marca</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium">Fecha límite</label>
                    <input
                      type="date" className="w-full mt-0.5 text-xs border border-gray-200 rounded px-2 py-1"
                      value={p.fecha_limite ?? ''}
                      onChange={e => onUpdate(p.id, { fecha_limite: e.target.value || null })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-gray-400 font-medium">Nota</label>
                    <input
                      type="text" className="w-full mt-0.5 text-xs border border-gray-200 rounded px-2 py-1"
                      value={p.nota ?? ''}
                      placeholder="Nota opcional…"
                      onChange={e => onUpdate(p.id, { nota: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium">Asignar a bloque</label>
                    <select
                      className="w-full mt-0.5 text-xs border border-gray-200 rounded px-2 py-1"
                      value={p.bloque_id ?? ''}
                      onChange={e => onUpdate(p.id, { bloque_id: e.target.value || null })}
                    >
                      <option value="">Sin bloque</option>
                      {bloques.map(b => <option key={b.id} value={b.id}>{DIAS[b.dia_semana]} — {b.titulo.slice(0, 30)}</option>)}
                    </select>
                  </div>
                  {p.bloque_id && (
                    <div>
                      <label className="text-[10px] text-gray-400 font-medium">Fecha asignada</label>
                      <input
                        type="date" className="w-full mt-0.5 text-xs border border-gray-200 rounded px-2 py-1"
                        value={p.fecha_asignada ?? ''}
                        onChange={e => onUpdate(p.id, { fecha_asignada: e.target.value || null })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
