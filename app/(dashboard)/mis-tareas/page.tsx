import Link from "next/link";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";

export const dynamic = "force-dynamic";
import { formatDate, getPriorityLabel, cn } from "@/lib/utils";
import { Calendar, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import type { Task } from "@/types/database";

export default async function MisTareasPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const tasksRaw = userId ? await sql`
    SELECT
      t.*,
      json_build_object('id', c.id, 'name', c.name, 'color', c.color) AS client,
      json_build_object('id', p.id, 'name', p.name, 'color', p.color) AS project,
      json_build_object('id', s.id, 'name', s.name, 'color', s.color) AS status
    FROM tasks t
    LEFT JOIN clients c ON c.id = t.client_id
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN project_statuses s ON s.id = t.status_id
    WHERE t.assignee_id = ${userId}
    ORDER BY t.due_date ASC NULLS LAST
  ` : [];

  const tasks = tasksRaw as unknown as Task[];
  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.due_date === today);
  const upcomingTasks = tasks.filter((t) => t.due_date && t.due_date > today);
  const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < today);
  const noDateTasks = tasks.filter((t) => !t.due_date);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Mis tareas" subtitle={`${tasks?.length ?? 0} tareas asignadas`} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl">
        {overdueTasks.length > 0 && (
          <TaskGroup
            title="Vencidas"
            tasks={overdueTasks as Task[]}
            icon={<AlertCircle className="w-3.5 h-3.5 text-red-400" />}
            color="text-red-400"
          />
        )}
        {todayTasks.length > 0 && (
          <TaskGroup
            title="Para hoy"
            tasks={todayTasks as Task[]}
            icon={<Clock className="w-3.5 h-3.5 text-amber-400" />}
            color="text-amber-400"
          />
        )}
        {upcomingTasks.length > 0 && (
          <TaskGroup
            title="Próximas"
            tasks={upcomingTasks as Task[]}
            icon={<Calendar className="w-3.5 h-3.5 text-blue-400" />}
            color="text-blue-400"
          />
        )}
        {noDateTasks.length > 0 && (
          <TaskGroup
            title="Sin fecha"
            tasks={noDateTasks as Task[]}
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />}
            color="text-gray-400"
          />
        )}
        {tasks.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-sm">
            No tienes tareas asignadas
          </div>
        )}
      </div>
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  icon,
  color,
}: {
  title: string;
  tasks: Task[];
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className={cn("text-xs font-semibold uppercase tracking-wide", color)}>{title}</h2>
        <span className="text-xs text-gray-400">({tasks.length})</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-600",
    high: "bg-orange-100 text-orange-600",
    medium: "bg-blue-100 text-blue-700",
    low: "bg-gray-100 text-gray-600",
  };

  return (
    <Link
      href={`/tareas/${task.id}`}
      className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 font-medium truncate group-hover:text-gray-900 transition-colors">
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {(task as any).client && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: (task as any).client.color }}
              />
              {(task as any).client.name}
            </span>
          )}
          {(task as any).project && (
            <span className="text-xs text-gray-400">· {(task as any).project.name}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {(task as any).status && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: (task as any).status.color }}
            />
            {(task as any).status.name}
          </span>
        )}
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", priorityColors[task.priority])}>
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
