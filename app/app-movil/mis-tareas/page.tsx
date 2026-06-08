import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, CheckSquare, Clock, Filter } from "lucide-react";

export default async function MisTareasPage() {
  const supabase = createAdminClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      id, title, status_id, due_date, priority, project_id,
      status:project_statuses(id, name, color),
      project:projects(id, name)
    `)
    .eq("assignee_id", "current-user-id")
    .neq("status_id", "done")
    .order("position");

  const { data: allTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("assignee_id", "current-user-id");

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-blue-100 text-blue-700",
    low: "bg-gray-100 text-gray-700"
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/app-movil" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Mis Tareas</h1>
          </div>
          <span className="text-sm text-gray-500">{allTasks?.length || 0} total</span>
        </div>
      </header>

      <div className="px-4 py-3 space-y-2">
        {tasks?.map((task) => {
          const status = (task.status as any);
          return (
            <Link
              key={task.id}
              href={`/app-movil/tareas/${task.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-3 h-3 rounded-full mt-1.5"
                  style={{ backgroundColor: status?.color || '#9CA3AF' }}
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${priorityColors[task.priority] || priorityColors.medium}`}>
                      {task.priority}
                    </span>
                    {task.due_date && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.due_date}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {(task.project as any)?.name}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        
        {(!tasks || tasks.length === 0) && (
          <div className="text-center py-12">
            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tienes tareas asignadas</p>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          <Link href="/app-movil" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[10px]">Inicio</span>
          </Link>
          <Link href="/app-movil/proyectos" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            <span className="text-[10px]">Proyectos</span>
          </Link>
          <Link href="/app-movil/tareas/nueva" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <span className="text-[10px]">Crear</span>
          </Link>
          <Link href="/app-movil/mis-tareas" className="flex flex-col items-center gap-1 p-2 text-violet-600">
            <CheckSquare className="w-5 h-5" />
            <span className="text-[10px]">Tareas</span>
          </Link>
          <Link href="/app-movil/mensajes" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <span className="text-[10px]">Msjs</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}