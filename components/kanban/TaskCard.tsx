"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Paperclip, AlertCircle, Play, Timer } from "lucide-react";
import { cn, formatDate, getInitials, getPriorityColor } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Task, TaskDeliverable } from "@/types/database";

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onSelect?: (taskId: string) => void;
}

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  urgent: <AlertCircle className="w-3 h-3 text-red-400" />,
  high: <AlertCircle className="w-3 h-3 text-orange-400" />,
};

export function TaskCard({ task, isDragging, onSelect }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Días restantes antes de eliminación automática (60 días desde scheduled_at)
  const daysLeft = task.scheduled_at
    ? Math.ceil(
        (new Date(task.scheduled_at).getTime() + 60 * 24 * 60 * 60 * 1000 - Date.now()) /
          (24 * 60 * 60 * 1000)
      )
    : null;

  const deliverables = (task.deliverables ?? []) as TaskDeliverable[];
  const latestDeliverable = deliverables[deliverables.length - 1];
  const thumbnail = latestDeliverable?.thumbnail_url;
  const isImage = latestDeliverable?.file_type?.startsWith("image");
  const isVideo = latestDeliverable?.file_type?.startsWith("video");
  const deliverableCount = deliverables.length;
  const commentCount = (task as any)._count?.comments ?? 0;

  function handleClick() {
    onSelect?.(task.id);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all group select-none",
        (isDragging || isSorting) && "opacity-50 shadow-2xl"
      )}
    >
      {/* Thumbnail */}
      {thumbnail && (
        <div className="relative w-full h-36 bg-gray-100 overflow-hidden">
          <img src={thumbnail} alt={task.title} className="w-full h-full object-cover" />
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
          )}
          {latestDeliverable?.status === "pending" && (
            <span className="absolute top-2 right-2 text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5">
              En revisión
            </span>
          )}
          {latestDeliverable?.status === "approved" && (
            <span className="absolute top-2 right-2 text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5">
              Aprobado
            </span>
          )}
        </div>
      )}

      <div className="p-3 space-y-2.5">
        {/* Countdown de expiración */}
        {daysLeft !== null && daysLeft <= 60 && (
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border w-fit",
              daysLeft <= 7
                ? "text-red-600 bg-red-50 border-red-200"
                : daysLeft <= 14
                ? "text-amber-600 bg-amber-50 border-amber-200"
                : "text-gray-500 bg-gray-100 border-gray-200"
            )}
          >
            <Timer className="w-2.5 h-2.5 shrink-0" />
            {daysLeft <= 0 ? "Expira hoy" : `${daysLeft}d`}
          </div>
        )}

        {/* Content type + priority */}
        <div className="flex items-center justify-between gap-2">
          {task.content_type && (
            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
              {task.content_type}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {PRIORITY_ICONS[task.priority]}
          </div>
        </div>

        {/* Title */}
        <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-relaxed">
          {task.title}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2.5">
            {task.due_date && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <Calendar className="w-3 h-3" />
                {formatDate(task.due_date)}
              </span>
            )}
            {deliverableCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <Paperclip className="w-3 h-3" />
                {deliverableCount}
              </span>
            )}
          </div>

          {task.assignee && (
            <Avatar className="w-5 h-5 shrink-0">
              <AvatarImage src={(task.assignee as any).avatar_url ?? undefined} />
              <AvatarFallback className="text-[8px] bg-violet-100 text-violet-600">
                {getInitials((task.assignee as any).full_name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}
