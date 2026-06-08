"use client";

import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCard } from "./TaskCard";
import type { ProjectStatus, Task } from "@/types/database";

interface KanbanColumnProps {
  status: ProjectStatus;
  tasks: Task[];
  projectColor: string;
  onAddTask: (statusId: string, title: string) => Promise<void>;
  onSelect: (taskId: string) => void;
}

export function KanbanColumn({ status, tasks, projectColor, onAddTask, onSelect }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function openAdd() {
    setTitle("");
    setAdding(true);
  }

  function cancelAdd() {
    setAdding(false);
    setTitle("");
  }

  async function confirmAdd() {
    const trimmed = title.trim();
    if (!trimmed) { cancelAdd(); return; }
    setSaving(true);
    await onAddTask(status.id, trimmed);
    setSaving(false);
    setTitle("");
    // keep the form open so user can add another quickly
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      confirmAdd();
    }
    if (e.key === "Escape") cancelAdd();
  }

  return (
    <div className="flex flex-col w-[272px] shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex-1 truncate">
          {status.name}
        </span>
        <span className="text-xs text-gray-400 font-medium tabular-nums">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-xl border border-dashed transition-colors min-h-[200px] p-2 space-y-2",
          isOver
            ? "border-violet-300 bg-violet-50"
            : "border-gray-200 bg-gray-50"
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onSelect={onSelect} />
          ))}
        </SortableContext>

        {tasks.length === 0 && !adding && (
          <div className="flex items-center justify-center h-24 text-xs text-gray-300">
            Sin tareas
          </div>
        )}

        {/* Inline add form */}
        {adding ? (
          <div className="bg-white border border-violet-300 rounded-lg p-2.5 space-y-2 shadow-sm">
            <textarea
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Título de la tarea…"
              rows={2}
              className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none leading-relaxed"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={confirmAdd}
                disabled={saving || !title.trim()}
                className="flex-1 py-1 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-xs text-white font-medium transition-colors"
              >
                {saving ? "Guardando…" : "Agregar"}
              </button>
              <button
                onClick={cancelAdd}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={openAdd}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:text-violet-400 transition-colors" />
            Agregar tarea
          </button>
        )}
      </div>
    </div>
  );
}
