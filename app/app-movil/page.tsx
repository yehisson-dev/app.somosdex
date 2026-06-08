import { auth } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  FolderKanban, Users, CheckSquare, Clock, 
  MessageSquare, Plus, Home, Menu
} from "lucide-react";

export default async function AppMovilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const supabase = createAdminClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, slug, color")
    .order("name");

  const { data: tasksCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact" });

  const { data: myTasks } = await supabase
    .from("tasks")
    .select("id, title, status_id, due_date")
    .eq("assignee_id", session.user.id)
    .neq("status_id", "done")
    .limit(10);

  const today = new Date().toISOString().split("T")[0];
  const { data: pendingToday } = await supabase
    .from("tasks")
    .select("id, title, due_date")
    .eq("assignee_id", session.user.id)
    .eq("due_date", today)
    .limit(10);

  const { data: messages } = await supabase
    .from("messages")
    .select("id, content, created_at, channel:channels(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  const projectColors: Record<string, string> = {
    "socialmedia": "#7C3AED",
    "default": "#6366F1"
  };

  const getProjectColor = (slug: string) => projectColors[slug] || projectColors.default;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">ClicUp</h1>
              <p className="text-xs text-gray-500">Móvil</p>
            </div>
          </div>
          <Link href="/app-movil/tareas/nueva" className="p-2 bg-violet-600 rounded-full">
            <Plus className="w-5 h-5 text-white" />
          </Link>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2">
            <p className="text-xl font-bold text-violet-600">{myTasks?.length || 0}</p>
            <p className="text-[10px] text-gray-500">Mis tareas</p>
          </div>
          <div className="p-2">
            <p className="text-xl font-bold text-orange-500">{pendingToday?.length || 0}</p>
            <p className="text-[10px] text-gray-500">Hoy</p>
          </div>
          <div className="p-2">
            <p className="text-xl font-bold text-emerald-600">{projects?.length || 0}</p>
            <p className="text-[10px] text-gray-500">Proyectos</p>
          </div>
          <div className="p-2">
            <p className="text-xl font-bold text-blue-500">{messages?.length || 0}</p>
            <p className="text-[10px] text-gray-500">Mensajes</p>
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Proyectos</h2>
        <div className="space-y-2">
          {projects?.slice(0, 5).map((project) => (
            <Link 
              key={project.id}
              href={`/app-movil/proyectos/${project.id}`}
              className="block bg-white rounded-xl p-3 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                  style={{ backgroundColor: getProjectColor(project.slug) }}
                >
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{project.name}</p>
                  <p className="text-xs text-gray-400">Ver clientes y tareas</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* My Tasks Preview */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Mis tareas</h2>
          <Link href="/app-movil/mis-tareas" className="text-xs text-violet-600">Ver todas</Link>
        </div>
        <div className="space-y-2">
          {myTasks?.slice(0, 3).map((task) => (
            <Link 
              key={task.id}
              href={`/app-movil/tareas/${task.id}`}
              className="block bg-white rounded-lg p-3 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                <p className="text-sm text-gray-800 truncate flex-1">{task.title}</p>
              </div>
            </Link>
          ))}
          {(!myTasks || myTasks.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">No tienes tareas pendientes</p>
          )}
        </div>
      </div>

      {/* Pending Today */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Pendientes hoy</h2>
          <Link href="/app-movil/pendientes" className="text-xs text-violet-600">Ver todos</Link>
        </div>
        <div className="space-y-2">
          {pendingToday?.slice(0, 3).map((task) => (
            <div key={task.id} className="bg-orange-50 rounded-lg p-3 border border-orange-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <p className="text-sm text-gray-800 truncate">{task.title}</p>
              </div>
            </div>
          ))}
          {(!pendingToday || pendingToday.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">No hay tareas para hoy</p>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          <Link href="/app-movil" className="flex flex-col items-center gap-1 p-2 text-violet-600">
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Inicio</span>
          </Link>
          <Link href="/app-movil/proyectos" className="flex flex-col items-center gap-1 p-2 text-gray-400">
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
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px]">Mensajes</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}