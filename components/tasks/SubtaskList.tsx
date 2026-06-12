"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle, Calendar, User as UserIcon, Flag } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { ProjectStatus, User } from "@/types/database";

interface Subtask {
  id: string;
  title: string;
  priority: string;
  status_id: string | null;
  assignee_id: string | null;
  due_date: string | null;
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

export function SubtaskList({ taskId, initialSubtasks, statuses, projectMembers }: Props) {
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

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
        {subtasks.map((sub) => {
          const isDone = sub.status_id ? doneIds.has(sub.status_id) : false;
          const pColor = priorityColor(sub.priority);
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
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pColor }} title={PRIORITIES.find(p => p.value === sub.priority)?.label} />
              )}

              <span className={cn(
                "flex-1 text-sm text-gray-700 min-w-0 truncate",
                isDone && "line-through text-gray-400"
              )}>
                {sub.title}
              </span>

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
                  className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[9px] font-bold flex items-center justify-center shrink-0"
                  title={sub.assignee.full_name}
                >
                  {sub.assignee.avatar_url
                    ? <img src={sub.assignee.avatar_url} className="w-full h-full rounded-full object-cover" />
                    : getInitials(sub.assignee.full_name)}
                </span>
              )}

              {/* Estado (si no está done) */}
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
          {/* Título */}
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

          {/* Fecha · Asignado · Prioridad */}
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

          {/* Acciones */}
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
    </section>
  );
}
