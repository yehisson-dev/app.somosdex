import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderKanban, ArrowLeft, ChevronRight } from "lucide-react";

export default async function ProyectosPage() {
  const supabase = createAdminClient();
  
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, slug, color, client:clients(id, name)")
    .order("name");

  const projectColors: Record<string, string> = {
    socialmedia: "#7C3AED",
    default: "#6366F1"
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/app-movil" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Proyectos</h1>
        </div>
      </header>

      <div className="px-4 py-3 space-y-2">
        {projects?.map((project) => {
          const color = projectColors[project.slug] || projectColors.default;
          return (
            <Link
              key={project.id}
              href={`/app-movil/proyectos/${project.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: color }}
                  >
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{project.name}</p>
                    <p className="text-sm text-gray-500">{(project.client as any)?.name || "Sin cliente"}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
            </Link>
          );
        })}
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <span className="text-[10px]">Crear</span>
          </Link>
          <Link href="/app-movil/mis-tareas" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
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