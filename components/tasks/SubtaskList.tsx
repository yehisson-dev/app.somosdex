"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
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

export function SubtaskList({ taskId, initialSubtasks, statuses, projectMembers }: Props) {
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const doneStatuses = statuses.filter((s) =>
    ["aprobado", "programado", "done", "completado", "listo"].some((w) =>
      s.name.toLowerCase().includes(w)
    )
  );
  const doneIds = new Set(doneStatuses.map((s) => s.id));

  async function addSubtask() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setSubtasks((prev) => [...prev, created]);
      setNewTitle("");
      setShowInput(false);
    } catch {
      toast.error("Error al crear subtarea");
    } finally {
      setAdding(false);
    }
  }

  async function toggleDone(sub: Subtask) {
    const isDone = sub.status_id && doneIds.has(sub.status_id);
    // Cycle: if done → first status (pendiente), else → first done status
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
          onClick={() => setShowInput((v) => !v)}
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

      {/* Lista de subtareas */}
      <div className="space-y-1.5 mb-2">
        {subtasks.map((sub) => {
          const isDone = sub.status_id ? doneIds.has(sub.status_id) : false;
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
                  : <Circle className="w-4 h-4" />
                }
              </button>

              <span className={cn(
                "flex-1 text-sm text-gray-700 min-w-0 truncate",
                isDone && "line-through text-gray-400"
              )}>
                {sub.title}
              </span>

              {sub.status && !isDone && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                  style={{ backgroundColor: sub.status.color + "20", color: sub.status.color }}
                >
                  {sub.status.name}
                </span>
              )}

              {sub.due_date && (
                <span className="text-[10px] text-gray-400 shrink-0">{formatDate(sub.due_date)}</span>
              )}

              {sub.assignee && (
                <span className="text-[10px] text-gray-400 shrink-0 hidden group-hover:inline">
                  {sub.assignee.full_name.split(" ")[0]}
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

      {/* Input nueva subtarea */}
      {showInput && (
        <div className="flex items-center gap-2 px-2 py-1.5 border border-violet-200 rounded-lg bg-violet-50/30">
          <Circle className="w-4 h-4 text-gray-300 shrink-0" />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addSubtask();
              if (e.key === "Escape") { setShowInput(false); setNewTitle(""); }
            }}
            placeholder="Nombre de la subtarea… (Enter para guardar)"
            autoFocus
            disabled={adding}
            className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-400 disabled:opacity-50"
          />
          <button
            onClick={addSubtask}
            disabled={adding || !newTitle.trim()}
            className="text-xs text-violet-600 hover:text-violet-700 font-medium disabled:opacity-40 transition-colors shrink-0"
          >
            {adding ? "…" : "Agregar"}
          </button>
          <button
            onClick={() => { setShowInput(false); setNewTitle(""); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {subtasks.length === 0 && !showInput && (
        <button
          onClick={() => setShowInput(true)}
          className="w-full text-left text-xs text-gray-400 hover:text-gray-600 py-2 border border-dashed border-gray-200 rounded-lg px-3 transition-colors"
        >
          + Agregar primera subtarea
        </button>
      )}
    </section>
  );
}
