import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users, CheckSquare, FolderKanban, Plus, ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProyectoDetailPage({ params }: Props) {
  const { id } = await params();
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, slug, color")
    .eq("id", id)
    .single();

  if (!project) redirect("/app-movil/proyectos");

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, company, logo_url")
    .eq("project_id", id)
    .order("name");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status_id, due_date, priority")
    .eq("project_id", id)
    .order("position");

  const { data: statuses } = await supabase
    .from("project_statuses")
    .select("id, name, color")
    .eq("project_id", id)
    .order("position");

  const getStatus = (statusId: string) => statuses?.find(s => s.id === statusId);
  const taskCount = tasks?.length || 0;
  const completedCount = tasks?.filter(t => getStatus(t.status_id)?.name?.toLowerCase() === "completado" || getStatus(t.status_id)?.name?.toLowerCase() === "hecho")?.length || 0;

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-blue-100 text-blue-700",
    low: "bg-gray-100 text-gray-700"
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/app-movil/proyectos" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">{project.name}</h1>
            <p className="text-xs text-gray-500">{taskCount} tareas · {completedCount} completadas</p>
          </div>
          <Link href={`/app-movil/tareas/nueva?proyecto=${id}`} className="p-2 bg-violet-600 rounded-full">
            <Plus className="w-5 h-5 text-white" />
          </Link>
        </div>
      </header>

      {/* Progress */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: taskCount > 0 ? `${(completedCount / taskCount) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600">
            {taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Clients */}
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Clientes ({clients?.length || 0})
        </h2>
        <div className="space-y-2">
          {clients?.map((client) => (
            <Link
              key={client.id}
              href={`/app-movil/clientes/${client.id}`}
              className="block bg-white rounded-xl p-3 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-3">
                {client.logo_url ? (
                  <img src={client.logo_url} alt={client.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-500">{client.company}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </Link>
          ))}
          {(!clients || clients.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">No hay clientes en este proyecto</p>
          )}
        </div>
      </div>

      {/* Tasks Preview */}
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <CheckSquare className="w-4 h-4" />
          Tareas ({tasks?.length || 0})
        </h2>
        <div className="space-y-2">
          {tasks?.slice(0, 10).map((task) => {
            const status = getStatus(task.status_id);
            return (
              <Link
                key={task.id}
                href={`/app-movil/tareas/${task.id}`}
                className="block bg-white rounded-lg p-3 shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: status?.color || '#9CA3AF' }}
                  />
                  <p className="text-sm text-gray-800 flex-1 truncate">{task.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${priorityColors[task.priority] || priorityColors.medium}`}>
                    {task.priority}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        {tasks && tasks.length > 10 && (
          <Link href={`/app-movil/proyectos/${id}/tareas`} className="block text-center text-sm text-violet-600 py-3">
            Ver todas las {tasks.length} tareas
          </Link>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          <Link href="/app-movil" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[10px]">Inicio</span>
          </Link>
          <Link href="/app-movil/proyectos" className="flex flex-col items-center gap-1 p-2 text-violet-600">
            <FolderKanban className="w-5 h-5" />
            <span className="text-[10px]">Proyectos</span>
          </Link>
          <Link href="/app-movil/tareas/nueva" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <Plus className="w-5 h-5" />
            <span className="text-[10px]">Crear</span>
          </Link>
          <Link href="/app-movil/mis-tareas" className="flex flex-col items-center gap-1 p-2 text-gray-400">
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