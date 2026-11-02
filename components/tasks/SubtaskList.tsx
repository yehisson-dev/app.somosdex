"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, CheckCircle2, Circle, Calendar, User as UserIcon,
  Flag, X, ChevronRight, Save, Link as LinkIcon, ExternalLink,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { ProjectStatus, User } from "@/types/database";

interface Resource { label: string; url: string; }

interface Subtask {
  id: string;
  title: string;
  priority: string;
  status_id: string | null;
  assignee_id: string | null;
  due_date: string | null;
  description: string | null;
  parent_task_id: string;
  status?: { id: string; name: string; color: string } | null;
  assignee?: { id: string; full_name: string; avatar_url?: string | null } | null;
}

interface Props {
  taskId: string;
  initialSubtasks: Subtask[];
  statuses: ProjectStatus[];
  projectMembers: User[];
  currentUserId: string;
}

const PRIORITIES = [
  { value: "none",   label: "Sin prioridad", color: "#9ca3af" },
  { value: "low",    label: "Baja",          color: "#22c55e" },
  { value: "medium", label: "Media",         color: "#f59e0b" },
  { value: "high",   label: "Alta",          color: "#ef4444" },
];

function priorityColor(p: string) {
  return PRIORITIES.find((x) => x.value === p)?.color ?? "#9ca3af";
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function parseResources(desc: string | null): { notes: string; resources: Resource[] } {
  if (!desc) return { notes: "", resources: [] };
  try {
    const marker = "\n\n__RECURSOS__\n";
    const idx = desc.indexOf(marker);
    if (idx === -1) return { notes: desc, resources: [] };
    const notes = desc.slice(0, idx);
    const resources: Resource[] = JSON.parse(desc.slice(idx + marker.length));
    return { notes, resources };
  } catch {
    return { notes: desc, resources: [] };
  }
}

function serializeDescription(notes: string, resources: Resource[]): string {
  if (!resources.length) return notes;
  return `${notes}\n\n__RECURSOS__\n${JSON.stringify(resources)}`;
}

// ── Drawer de detalle de subtarea ──────────────────────────────────────────────
function SubtaskDrawer({
  sub,
  taskId,
  statuses,
  projectMembers,
  onClose,
  onUpdate,
}: {
  sub: Subtask;
  taskId: string;
  statuses: ProjectStatus[];
  projectMembers: User[];
  onClose: () => void;
  onUpdate: (updated: Subtask) => void;
}) {
  const { notes: initNotes, resources: initResources } = parseResources(sub.description);
  const [title, setTitle]         = useState(sub.title);
  const [dueDate, setDueDate]     = useState(sub.due_date ?? "");
  const [assigneeId, setAssigneeId] = useState(sub.assignee_id ?? "");
  const [notes, setNotes]         = useState(initNotes);
  const [resources, setResources] = useState<Resource[]>(initResources);
  const [newLabel, setNewLabel]   = useState("");
  const [newUrl, setNewUrl]       = useState("");
  const [saving, setSaving]       = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const description = serializeDescription(notes, resources);
    const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtaskId: sub.id, title: title.trim(), description, due_date: dueDate || null, assignee_id: assigneeId || null }),
    });
    setSaving(false);
    if (res.ok) {
      const newAssignee = projectMembers.find((m) => m.id === assigneeId) ?? null;
      onUpdate({ ...sub, title: title.trim(), description, due_date: dueDate || null, assignee_id: assigneeId || null, assignee: newAssignee ? { id: newAssignee.id, full_name: (newAssignee as any).full_name, avatar_url: (newAssignee as any).avatar_url } : null });
      toast.success("Guardado");
    } else {
      toast.error("Error al guardar");
    }
  }

  function addResource() {
    if (!newUrl.trim()) return;
    const url = newUrl.startsWith("http") ? newUrl.trim() : `https://${newUrl.trim()}`;
    setResources((prev) => [...prev, { label: newLabel.trim() || url, url }]);
    setNewLabel("");
    setNewUrl("");
  }

  function removeResource(i: number) {
    setResources((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 text-sm font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-violet-400 outline-none py-0.5 min-w-0 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Meta: estado, asignado, fecha */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            {sub.status && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Estado</p>
                <span className="px-2 py-1 rounded-full font-medium"
                  style={{ backgroundColor: sub.status.color + "20", color: sub.status.color }}>
                  {sub.status.name}
                </span>
              </div>
            )}
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Responsable</p>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-violet-400 w-full"
              >
                <option value="">Sin asignar</option>
                {projectMembers.map((m) => (
                  <option key={m.id} value={m.id}>{(m as any).full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Fecha límite</p>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-violet-400 [color-scheme:light] w-full"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Observaciones
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Escribe tus observaciones, notas o instrucciones sobre esta subtarea…"
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-400 placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* Recursos */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Recursos
            </label>

            {/* Lista de recursos */}
            {resources.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {resources.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 group">
                    <LinkIcon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-violet-600 hover:underline truncate min-w-0"
                    >
                      {r.label}
                    </a>
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="text-gray-300 hover:text-gray-500 shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => removeResource(i)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar recurso */}
            <div className="space-y-2 border border-dashed border-gray-200 rounded-xl p-3">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nombre (ej: Drive, Figma…)"
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-violet-400 placeholder:text-gray-400"
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addResource()}
                  placeholder="https://…"
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-violet-400 placeholder:text-gray-400"
                />
                <button
                  onClick={addResource}
                  disabled={!newUrl.trim()}
                  className="flex items-center gap-1 text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-medium px-3 py-2 rounded-lg transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SubtaskList({ taskId, initialSubtasks, statuses, projectMembers }: Props) {
  const [subtasks, setSubtasks]     = useState<Subtask[]>(initialSubtasks);
  const [showForm, setShowForm]     = useState(false);
  const [adding, setAdding]         = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [updating, setUpdating]     = useState<string | null>(null);
  const [openSub, setOpenSub]       = useState<Subtask | null>(null);

  // form state
  const [newTitle, setNewTitle]       = useState("");
  const [newDueDate, setNewDueDate]   = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState("none");

  const doneStatuses = statuses.filter((s) =>
    ["aprobado", "programado", "done", "completado", "listo"].some((w) =>
      s.name.toLowerCase().includes(w)
    )
  );
  const doneIds = new Set(doneStatuses.map((s) => s.id));

  function resetForm() {
    setNewTitle(""); setNewDueDate(""); setNewAssignee(""); setNewPriority("none");
    setShowForm(false);
  }

  async function addSubtask() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          due_date:    newDueDate    || null,
          assignee_id: newAssignee   || null,
          priority:    newPriority,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setSubtasks((prev) => [...prev, created]);
      resetForm();
    } catch {
      toast.error("Error al crear subtarea");
    } finally {
      setAdding(false);
    }
  }

  async function toggleDone(sub: Subtask) {
    const isDone = sub.status_id && doneIds.has(sub.status_id);
    const target = isDone
      ? (statuses.find((s) => !doneIds.has(s.id))?.id ?? null)
      : (doneStatuses[0]?.id ?? statuses[statuses.length - 1]?.id ?? null);

    setUpdating(sub.id);
    const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtaskId: sub.id, status_id: target }),
    });
    setUpdating(null);
    if (res.ok) {
      const newStatus = statuses.find((s) => s.id === target) ?? null;
      setSubtasks((prev) =>
        prev.map((s) => s.id === sub.id ? { ...s, status_id: target, status: newStatus } : s)
      );
    }
  }

  async function deleteSubtask(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtaskId: id }),
    });
    setDeleting(null);
    if (res.ok) {
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
    } else {
      toast.error("Error al eliminar subtarea");
    }
  }

  const completedCount = subtasks.filter((s) => s.status_id && doneIds.has(s.status_id)).length;
  const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Subtareas ({subtasks.length})
          </h3>
          {subtasks.length > 0 && (
            <span className="text-xs text-gray-400">{completedCount}/{subtasks.length}</span>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar
        </button>
      </div>

      {/* Barra de progreso */}
      {subtasks.length > 0 && (
        <div className="mb-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Lista */}
      <div className="space-y-1.5 mb-2">
        {[...subtasks].sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        }).map((sub) => {
          const isDone = sub.status_id ? doneIds.has(sub.status_id) : false;
          const pColor = priorityColor(sub.priority);
          const { notes, resources } = parseResources(sub.description);
          const hasDetails = notes.trim() || resources.length > 0;

          return (
            <div
              key={sub.id}
              className="flex items-center gap-2 group px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <button
                onClick={() => toggleDone(sub)}
                disabled={updating === sub.id}
                className="shrink-0 text-gray-300 hover:text-violet-500 transition-colors disabled:opacity-40"
              >
                {isDone
                  ? <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  : <Circle className="w-4 h-4" />}
              </button>

              {/* Prioridad dot */}
              {sub.priority && sub.priority !== "none" && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pColor }}
                  title={PRIORITIES.find(p => p.value === sub.priority)?.label} />
              )}

              {/* Título — clickable */}
              <button
                onClick={() => setOpenSub(sub)}
                className={cn(
                  "flex-1 text-sm text-left min-w-0 truncate hover:text-violet-600 transition-colors",
                  isDone ? "line-through text-gray-400" : "text-gray-700"
                )}
              >
                {sub.title}
              </button>

              {/* Indicador de detalles */}
              {hasDetails && (
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-violet-400" title="Tiene observaciones o recursos" />
              )}

              {/* Fecha */}
              {sub.due_date && (
                <span className="flex items-center gap-0.5 text-[10px] text-gray-400 shrink-0">
                  <Calendar className="w-3 h-3" />
                  {formatDate(sub.due_date)}
                </span>
              )}

              {/* Asignado */}
              {sub.assignee && (
                <span
                  className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[9px] font-bold flex items-center justify-center shrink-0 overflow-hidden"
                  title={sub.assignee.full_name}
                >
                  {sub.assignee.avatar_url
                    ? <img src={sub.assignee.avatar_url} className="w-full h-full object-cover" />
                    : getInitials(sub.assignee.full_name)}
                </span>
              )}

              {/* Estado */}
              {sub.status && !isDone && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                  style={{ backgroundColor: sub.status.color + "20", color: sub.status.color }}
                >
                  {sub.status.name}
                </span>
              )}

              <button
                onClick={() => deleteSubtask(sub.id)}
                disabled={deleting === sub.id}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Formulario nueva subtarea */}
      {showForm && (
        <div className="border border-violet-200 rounded-xl bg-violet-50/30 p-3 space-y-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addSubtask();
              if (e.key === "Escape") resetForm();
            }}
            placeholder="Nombre de la subtarea…"
            autoFocus
            disabled={adding}
            className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-violet-400 placeholder:text-gray-400 disabled:opacity-50"
          />

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">
                <Calendar className="w-3 h-3" /> Fecha
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-violet-400 [color-scheme:light]"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">
                <UserIcon className="w-3 h-3" /> Asignado
              </label>
              <select
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-violet-400"
              >
                <option value="">Sin asignar</option>
                {projectMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">
                <Flag className="w-3 h-3" /> Prioridad
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-violet-400"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={addSubtask}
              disabled={adding || !newTitle.trim()}
              className="text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              {adding ? "Guardando…" : "Agregar subtarea"}
            </button>
          </div>
        </div>
      )}

      {subtasks.length === 0 && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full text-left text-xs text-gray-400 hover:text-gray-600 py-2 border border-dashed border-gray-200 rounded-lg px-3 transition-colors"
        >
          + Agregar primera subtarea
        </button>
      )}

      {/* Drawer de detalle */}
      {openSub && (
        <SubtaskDrawer
          sub={openSub}
          taskId={taskId}
          statuses={statuses}
          projectMembers={projectMembers}
          onClose={() => setOpenSub(null)}
          onUpdate={(updated) => {
            setSubtasks((prev) => prev.map((s) => s.id === updated.id ? updated : s));
            setOpenSub(updated);
          }}
        />
      )}
    </section>
  );
}
