"use client";

import { useState } from "react";
import {
  Plus, X, Phone, Mail, Building2, DollarSign,
  Calendar, User, ChevronDown, Trash2, Edit2, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type Stage = "contacto" | "calificado" | "propuesta" | "negociacion" | "ganado" | "perdido";

export interface Prospecto {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  stage: Stage;
  value: number;
  currency: string;
  notes?: string;
  source?: string;
  expected_close?: string;
  assigned_to?: string;
  assigned_user?: { id: string; full_name: string; avatar_url?: string } | null;
  created_at: string;
}

// ─── Configuración de etapas ──────────────────────────────────────────────────
const STAGES: { id: Stage; label: string; color: string; bg: string; dot: string }[] = [
  { id: "contacto",    label: "Contacto inicial", color: "text-blue-600",   bg: "bg-blue-50",   dot: "bg-blue-400" },
  { id: "calificado",  label: "Calificado",        color: "text-violet-600", bg: "bg-violet-50", dot: "bg-violet-400" },
  { id: "propuesta",   label: "Propuesta enviada", color: "text-amber-600",  bg: "bg-amber-50",  dot: "bg-amber-400" },
  { id: "negociacion", label: "Negociación",        color: "text-orange-600", bg: "bg-orange-50", dot: "bg-orange-400" },
  { id: "ganado",      label: "Ganado ✓",           color: "text-green-600",  bg: "bg-green-50",  dot: "bg-green-500" },
  { id: "perdido",     label: "Perdido",             color: "text-red-500",    bg: "bg-red-50",    dot: "bg-red-400" },
];

const SOURCES = ["Referido", "LinkedIn", "Instagram", "Web", "Evento", "Email", "Otro"];
const CURRENCIES = ["USD", "EUR", "DOP", "MXN", "COP"];

function fmt(v: number, c: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(v);
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

// ─── Formulario de nuevo/editar prospecto ─────────────────────────────────────
function ProspectoForm({
  usuarios,
  initial,
  defaultStage,
  onSave,
  onClose,
}: {
  usuarios: any[];
  initial?: Partial<Prospecto>;
  defaultStage?: Stage;
  onSave: (p: Prospecto) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    company: initial?.company ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    stage: initial?.stage ?? defaultStage ?? "contacto",
    value: initial?.value ?? 0,
    currency: initial?.currency ?? "USD",
    notes: initial?.notes ?? "",
    source: initial?.source ?? "",
    expected_close: initial?.expected_close ?? "",
    assigned_to: initial?.assigned_to ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    setError("");
    try {
      const body = { ...form, value: Number(form.value), assigned_to: form.assigned_to || null };
      const url = initial?.id ? `/api/prospectos/${initial.id}` : "/api/prospectos";
      const method = initial?.id ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onSave(json.data);
    } catch (e: any) {
      setError(e.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">{initial?.id ? "Editar prospecto" : "Nuevo prospecto"}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Nombre del contacto" />
          </div>

          {/* Empresa */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
            <input value={form.company} onChange={e => set("company", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Nombre de la empresa" />
          </div>

          {/* Email + Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="correo@empresa.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input value={form.phone} onChange={e => set("phone", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="+1 809 000 0000" />
            </div>
          </div>

          {/* Valor + Moneda */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor del negocio</label>
              <input type="number" min="0" value={form.value} onChange={e => set("value", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
              <select value={form.currency} onChange={e => set("currency", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Etapa */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Etapa</label>
            <select value={form.stage} onChange={e => set("stage", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {/* Fuente + Fecha cierre */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fuente</label>
              <select value={form.source} onChange={e => set("source", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">— Seleccionar —</option>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cierre estimado</label>
              <input type="date" value={form.expected_close} onChange={e => set("expected_close", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          {/* Asignado a */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Asignado a</label>
            <select value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">— Sin asignar —</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              placeholder="Notas internas sobre este prospecto..." />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? "Guardando..." : initial?.id ? "Guardar cambios" : "Crear prospecto"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Tarjeta de prospecto ─────────────────────────────────────────────────────
function ProspectoCard({
  prospecto,
  onEdit,
  onDelete,
  onStageChange,
}: {
  prospecto: Prospecto;
  onEdit: () => void;
  onDelete: () => void;
  onStageChange: (stage: Stage) => void;
}) {
  const [stageOpen, setStageOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`¿Eliminar a ${prospecto.name}?`)) return;
    setDeleting(true);
    await fetch(`/api/prospectos/${prospecto.id}`, { method: "DELETE" });
    onDelete();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{prospecto.name}</p>
          {prospecto.company && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3" /> {prospecto.company}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} disabled={deleting} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Valor */}
      {prospecto.value > 0 && (
        <div className="flex items-center gap-1 mb-3">
          <DollarSign className="w-3.5 h-3.5 text-green-500" />
          <span className="text-sm font-semibold text-green-600">{fmt(prospecto.value, prospecto.currency)}</span>
        </div>
      )}

      {/* Contacto */}
      <div className="space-y-1 mb-3">
        {prospecto.email && (
          <a href={`mailto:${prospecto.email}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600 truncate">
            <Mail className="w-3 h-3 shrink-0" /> {prospecto.email}
          </a>
        )}
        {prospecto.phone && (
          <a href={`tel:${prospecto.phone}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600">
            <Phone className="w-3 h-3 shrink-0" /> {prospecto.phone}
          </a>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {/* Asignado */}
        {prospecto.assigned_user ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-[9px] font-semibold text-violet-600 shrink-0">
              {initials(prospecto.assigned_user.full_name)}
            </div>
            <span className="text-xs text-gray-500 truncate max-w-[80px]">{prospecto.assigned_user.full_name.split(" ")[0]}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-300 flex items-center gap-1"><User className="w-3 h-3" /> Sin asignar</span>
        )}

        {/* Fecha cierre */}
        {prospecto.expected_close && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(prospecto.expected_close + "T00:00:00").toLocaleDateString("es", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>

      {/* Cambio rápido de etapa */}
      <div className="relative mt-2">
        <button
          onClick={() => setStageOpen(v => !v)}
          className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-600 py-1 px-2 rounded hover:bg-gray-50 transition-colors"
        >
          <span>Mover a etapa</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {stageOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
            {STAGES.map(s => (
              <button
                key={s.id}
                onClick={() => { onStageChange(s.id); setStageOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors",
                  s.id === prospecto.stage ? "text-violet-600 font-medium" : "text-gray-600"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} />
                {s.label}
                {s.id === prospecto.stage && <Check className="w-3 h-3 ml-auto text-violet-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Columna del pipeline ─────────────────────────────────────────────────────
function PipelineColumn({
  stage,
  prospectos,
  onAdd,
  onEdit,
  onDelete,
  onStageChange,
}: {
  stage: typeof STAGES[number];
  prospectos: Prospecto[];
  onAdd: () => void;
  onEdit: (p: Prospecto) => void;
  onDelete: (id: string) => void;
  onStageChange: (id: string, stage: Stage) => void;
}) {
  const total = prospectos.reduce((s, p) => s + (p.value ?? 0), 0);
  const currency = prospectos[0]?.currency ?? "USD";

  return (
    <div className="flex flex-col min-w-[260px] max-w-[260px]">
      {/* Header columna */}
      <div className={cn("rounded-t-xl px-3 py-2.5 border border-b-0", stage.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", stage.dot)} />
            <span className={cn("text-xs font-semibold", stage.color)}>{stage.label}</span>
            <span className="text-xs bg-white/60 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
              {prospectos.length}
            </span>
          </div>
          <button
            onClick={onAdd}
            className={cn("p-1 rounded-md hover:bg-white/50 transition-colors", stage.color)}
            title="Agregar prospecto"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {total > 0 && (
          <p className="text-xs text-gray-500 mt-1 font-medium">
            {fmt(total, currency)} en pipeline
          </p>
        )}
      </div>

      {/* Tarjetas */}
      <div className="flex-1 border border-t-0 border-gray-200 rounded-b-xl bg-gray-50 p-2 space-y-2 min-h-[200px]">
        {prospectos.map(p => (
          <ProspectoCard
            key={p.id}
            prospecto={p}
            onEdit={() => onEdit(p)}
            onDelete={() => onDelete(p.id)}
            onStageChange={(stage) => onStageChange(p.id, stage)}
          />
        ))}
        {prospectos.length === 0 && (
          <div className="flex flex-col items-center justify-center h-20 text-gray-300">
            <p className="text-xs">Sin prospectos</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline principal ───────────────────────────────────────────────────────
export function ProspectosPipeline({
  initialProspectos,
  usuarios,
}: {
  initialProspectos: Prospecto[];
  usuarios: any[];
}) {
  const [prospectos, setProspectos] = useState<Prospecto[]>(initialProspectos);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Prospecto | null>(null);
  const [defaultStage, setDefaultStage] = useState<Stage>("contacto");

  const totalPipeline = prospectos
    .filter(p => !["ganado", "perdido"].includes(p.stage))
    .reduce((s, p) => s + (p.value ?? 0), 0);
  const totalGanado = prospectos.filter(p => p.stage === "ganado").reduce((s, p) => s + (p.value ?? 0), 0);

  function openAdd(stage?: Stage) {
    setEditTarget(null);
    setDefaultStage(stage ?? "contacto");
    setShowForm(true);
  }

  function handleSaved(p: Prospecto) {
    setProspectos(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = p; return n; }
      return [p, ...prev];
    });
    setShowForm(false);
    setEditTarget(null);
  }

  function handleDelete(id: string) {
    setProspectos(prev => prev.filter(p => p.id !== id));
  }

  async function handleStageChange(id: string, stage: Stage) {
    const res = await fetch(`/api/prospectos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (res.ok) {
      setProspectos(prev => prev.map(p => p.id === id ? { ...p, stage } : p));
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Total en pipeline</span>
          <span className="text-sm font-bold text-gray-900">{fmt(totalPipeline, "USD")}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Ganado</span>
          <span className="text-sm font-bold text-green-600">{fmt(totalGanado, "USD")}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Prospectos activos</span>
          <span className="text-sm font-bold text-gray-900">
            {prospectos.filter(p => !["ganado", "perdido"].includes(p.stage)).length}
          </span>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => openAdd()}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo prospecto
          </button>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full">
          {STAGES.map(stage => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              prospectos={prospectos.filter(p => p.stage === stage.id)}
              onAdd={() => openAdd(stage.id)}
              onEdit={(p) => { setEditTarget(p); setShowForm(true); }}
              onDelete={handleDelete}
              onStageChange={handleStageChange}
            />
          ))}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <ProspectoForm
          usuarios={usuarios}
          initial={editTarget ?? undefined}
          defaultStage={defaultStage}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
