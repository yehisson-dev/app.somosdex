"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Upload,
  CheckCircle,
  XCircle,
  AtSign,
  Clock,
  MessageSquare,
  BellOff,
} from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { NotificationType } from "@/types/database";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string; label: string }> = {
  task_assigned:          { icon: <CheckSquare className="w-4 h-4" />,  color: "text-violet-600 bg-violet-50",  label: "Tarea asignada" },
  deliverable_uploaded:   { icon: <Upload className="w-4 h-4" />,       color: "text-blue-600 bg-blue-50",      label: "Entregable subido" },
  deliverable_approved:   { icon: <CheckCircle className="w-4 h-4" />,  color: "text-green-600 bg-green-50",    label: "Entregable aprobado" },
  deliverable_rejected:   { icon: <XCircle className="w-4 h-4" />,      color: "text-red-600 bg-red-50",        label: "Entregable rechazado" },
  comment_mention:        { icon: <AtSign className="w-4 h-4" />,        color: "text-amber-600 bg-amber-50",    label: "Mención en comentario" },
  task_due:               { icon: <Clock className="w-4 h-4" />,         color: "text-red-600 bg-red-50",        label: "Tarea vencida" },
  task_due_soon:          { icon: <Clock className="w-4 h-4" />,         color: "text-amber-600 bg-amber-50",    label: "Tarea próxima" },
  message_mention:        { icon: <AtSign className="w-4 h-4" />,        color: "text-violet-600 bg-violet-50",  label: "Mención en mensaje" },
  task_comment:           { icon: <MessageSquare className="w-4 h-4" />, color: "text-blue-600 bg-blue-50",      label: "Comentario en tarea" },
};

export function NotificationPanel({ open, onClose }: Props) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, markNotificationRead, markAllRead, unreadCount } = useAppStore();

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleRead(id: string, taskId: string | null, channelId: string | null) {
    markNotificationRead(id);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onClose();
    if (taskId) router.push(`/tareas/${taskId}`);
    else if (channelId) router.push(`/mensajes?channel=${channelId}`);
  }

  async function handleMarkAllRead() {
    markAllRead();
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  return (
    <div
      ref={panelRef}
      className="absolute top-12 right-0 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">
          Notificaciones {unreadCount > 0 && <span className="ml-1 text-violet-600">({unreadCount})</span>}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[10px] text-violet-600 hover:text-violet-800 font-medium transition-colors"
          >
            Marcar todo leído
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="overflow-y-auto max-h-96">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
            <BellOff className="w-6 h-6 opacity-40" />
            <p className="text-xs">Sin notificaciones</p>
          </div>
        ) : (
          notifications.map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.task_assigned;
            return (
              <button
                key={n.id}
                onClick={() => handleRead(n.id, n.task_id, n.channel_id)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 border-b border-gray-50",
                  !n.is_read && "bg-violet-50/40"
                )}
              >
                <span className={cn("mt-0.5 p-1.5 rounded-lg shrink-0", cfg.color)}>
                  {cfg.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs leading-snug", n.is_read ? "text-gray-600" : "text-gray-900 font-medium")}>
                    {n.title}
                  </p>
                  {n.body && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{n.body}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{formatRelativeDate(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
