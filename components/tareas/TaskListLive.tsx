"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Calendar, AlertCircle, Clock, CheckCircle2, Loader2, RefreshCw, User } from "lucide-react";
import { formatDate, getPriorityLabel, cn } from "@/lib/utils";

interface Task {
  id: string; title: string; priority: string;
  due_date?: string | null; scheduled_date?: string | null;
  assignee_id?: string; approver_id?: string;
  client?: { id: string; name: string; color: string } | null;
  project?: { id: string; name: string; color: string } | null;
  status?: { id: string; name: string; color: string } | null;
  assignee?: { id: string; name: string; avatar?: string } | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-600",
  high:   "bg-orange-100 text-orange-600",
  medium: "bg-blue-100 text-blue-700",
  low:    "bg-gray-100 text-gray-500",
};

function TaskRow({ task, showAssignee }: { task: Task; showAssignee?: boolean }) {
  return (
    <Link
      href={`/tareas/${task.id}`}
      className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-violet-300 hover:shadow-sm transition-all group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 font-medium truncate group-hover:text-gray-900">
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.client && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: task.client.color }} />
              {task.client.name}
            </span>
          )}
          {task.project && (
            <span className="text-xs text-gray-400">· {task.project.name}</span>
          )}
          {showAssignee && task.assignee && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <User className="w-2.5 h-2.5" /> {task.assignee.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        {task.status && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.status.color }} />
            {task.status.name}
          </span>
        )}
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium)}>
          {getPriorityLabel(task.priority)}
        </span>
        {task.due_date && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </Link>
  );
}

function TaskGroup({ title, tasks, icon, color, showAssignee }: {
  title: string; tasks: Task[]; icon: React.ReactNode; color: string; showAssignee?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className={cn("text-xs font-semibold uppercase tracking-wide", color)}>{title}</h2>
        <span className="text-xs text-gray-400">({tasks.length})</span>
      </div>
      <div className="space-y-2">
        {tasks.map(t => <TaskRow key={t.id} task={t} showAssignee={showAssignee} />)}
      </div>
    </div>
  );
}

export function TaskListLive({
  apiUrl,
  emptyMessage = "No tienes tareas pendientes",
  showAssignee = false,
  onlyTodayAndOverdue = false,
  refreshIntervalMs = 30_000,
}: {
  apiUrl: string;
  emptyMessage?: string;
  showAssignee?: boolean;
  onlyTodayAndOverdue?: boolean;
  refreshIntervalMs?: number;
}) {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res  = await fetch(apiUrl, { cache: "no-store" });
      const data = await res.json();
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setLastRefresh(new Date());
    } finally {
      if (!silent) setLoading(false);
    }
  }, [apiUrl]);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Auto-refresh on window focus
  useEffect(() => {
    function onFocus() { load(true); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // Periodic refresh
  useEffect(() => {
    const id = setInterval(() => load(true), refreshIntervalMs);
    return () => clearInterval(id);
  }, [load, refreshIntervalMs]);

  const today    = new Date().toISOString().split("T")[0];
  const overdue  = tasks.filter(t => t.due_date && t.due_date < today);
  const forToday = tasks.filter(t => t.due_date === today);
  const upcoming = tasks.filter(t => t.due_date && t.due_date > today);
  const noDate   = tasks.filter(t => !t.due_date);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-300" />
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        </div>
      )}

      {overdue.length > 0 && (
        <TaskGroup title="Retrasadas" tasks={overdue} showAssignee={showAssignee}
          icon={<AlertCircle className="w-3.5 h-3.5 text-red-400" />} color="text-red-400" />
      )}
      {forToday.length > 0 && (
        <TaskGroup title="Para hoy" tasks={forToday} showAssignee={showAssignee}
          icon={<Clock className="w-3.5 h-3.5 text-amber-400" />} color="text-amber-400" />
      )}
      {!onlyTodayAndOverdue && upcoming.length > 0 && (
        <TaskGroup title="Próximas" tasks={upcoming} showAssignee={showAssignee}
          icon={<Calendar className="w-3.5 h-3.5 text-blue-400" />} color="text-blue-400" />
      )}
      {!onlyTodayAndOverdue && noDate.length > 0 && (
        <TaskGroup title="Sin fecha" tasks={noDate} showAssignee={showAssignee}
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />} color="text-gray-400" />
      )}

      {/* Last refresh indicator */}
      {lastRefresh && tasks.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-gray-300 pt-2">
          <RefreshCw className="w-2.5 h-2.5" />
          Actualizado {lastRefresh.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
          · se actualiza al enfocar la ventana
        </div>
      )}
    </div>
  );
}
