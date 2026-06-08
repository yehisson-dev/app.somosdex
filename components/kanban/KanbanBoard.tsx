"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TaskSlideOver } from "./TaskSlideOver";
import type { Project, Client, ProjectStatus, Task, User } from "@/types/database";

interface KanbanBoardProps {
  project: Project;
  client: Client;
  statuses: ProjectStatus[];
  initialTasks: Task[];
  projectMembers: User[];
  currentUserId: string;
}

export function KanbanBoard({
  project,
  client,
  statuses,
  initialTasks,
  projectMembers,
  currentUserId,
}: KanbanBoardProps) {
  const router = useRouter();
  const supabase = createClient();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Slide-over
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);

  // Sincronizar cuando el servidor refresca los datos (router.refresh)
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Abrir tarea — fetcha versión completa con relaciones
  async function openTask(taskId: string) {
    setLoadingTask(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (data && !data.error) setSelectedTask(data as Task);
    } catch (e) {
      console.error("[openTask]", e);
    } finally {
      setLoadingTask(false);
    }
  }

  function closeTask() {
    setSelectedTask(null);
    // Refrescar el kanban para reflejar cualquier cambio hecho en el slide-over
    router.refresh();
  }

  // ── Agregar tarea rápida ───────────────────────────────────────────────────
  async function handleAddTask(statusId: string, title: string) {
    const maxPos = tasks
      .filter((t) => t.status_id === statusId)
      .reduce((max, t) => Math.max(max, t.position), -1);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        project_id: project.id,
        client_id: client.id,
        status_id: statusId,
        position: maxPos + 1,
        priority: "medium",
      } as any)
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url),
        status:project_statuses(id, name, color),
        deliverables:task_deliverables(id, file_type, thumbnail_url, status, version)
      `)
      .single();

    if (error || !data) {
      toast.error("Error al crear la tarea");
      return;
    }

    setTasks((prev) => [...prev, data as Task]);
    router.refresh();
    toast.success("Tarea creada");
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getTasksByStatus = useCallback(
    (statusId: string) =>
      tasks
        .filter((t) => t.status_id === statusId)
        .sort((a, b) => a.position - b.position),
    [tasks]
  );

  function onDragStart({ active }: DragStartEvent) {
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task ?? null);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const overStatus = statuses.find((s) => s.id === overId);
    if (overStatus && activeTask.status_id !== overId) {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status_id: overId } : t))
      );
    }

    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && overTask.status_id !== activeTask.status_id) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status_id: overTask.status_id } : t
        )
      );
    }
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;

    const targetStatusId =
      statuses.find((s) => s.id === overId)?.id ??
      tasks.find((t) => t.id === overId)?.status_id ??
      task.status_id;

    const columnTasks = tasks
      .filter((t) => t.status_id === targetStatusId)
      .sort((a, b) => a.position - b.position);

    const oldIdx = columnTasks.findIndex((t) => t.id === activeId);
    const newIdx = columnTasks.findIndex((t) => t.id === overId);

    let reordered = columnTasks;
    if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
      reordered = arrayMove(columnTasks, oldIdx, newIdx);
    }

    const updatedPositions = reordered.map((t, i) => ({ ...t, position: i, status_id: targetStatusId }));
    setTasks((prev) =>
      prev.map((t) => {
        const updated = updatedPositions.find((u) => u.id === t.id);
        return updated ?? t;
      })
    );

    try {
      await Promise.all(
        updatedPositions.map((t) =>
          supabase
            .from("tasks")
            .update({ status_id: t.status_id ?? undefined, position: t.position } as any)
            .eq("id", t.id)
        )
      );
      router.refresh();
    } catch {
      toast.error("Error al mover la tarea");
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-6 h-full min-h-0" style={{ minWidth: `${statuses.length * 280}px` }}>
            {statuses.map((status) => (
              <KanbanColumn
                key={status.id}
                status={status}
                tasks={getTasksByStatus(status.id)}
                projectColor={project.color}
                onAddTask={handleAddTask}
                onSelect={openTask}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rotate-2 opacity-90">
              <TaskCard task={activeTask} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Loading indicator */}
      {loadingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl px-5 py-3 shadow-lg text-sm text-gray-600 flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            Cargando tarea…
          </div>
        </div>
      )}

      {/* Slide-over */}
      {selectedTask && (
        <TaskSlideOver
          task={selectedTask}
          statuses={statuses}
          projectMembers={projectMembers}
          currentUserId={currentUserId}
          onClose={closeTask}
        />
      )}
    </>
  );
}
