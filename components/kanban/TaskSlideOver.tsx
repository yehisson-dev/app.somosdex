"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { TaskDetailClient } from "@/components/tasks/TaskDetailClient";
import type { Task, ProjectStatus, User } from "@/types/database";

interface TaskSlideOverProps {
  task: Task;
  statuses: ProjectStatus[];
  projectMembers: User[];
  currentUserId: string;
  onClose: () => void;
}

export function TaskSlideOver({
  task,
  statuses,
  projectMembers,
  currentUserId,
  onClose,
}: TaskSlideOverProps) {
  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Bloquear scroll del body mientras el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative ml-auto h-full w-full max-w-3xl bg-white shadow-2xl",
          "flex flex-col animate-in slide-in-from-right duration-200"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <TaskDetailClient
          task={task}
          statuses={statuses}
          projectMembers={projectMembers}
          currentUserId={currentUserId}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
