import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { ProjectCard } from "@/components/projects/ProjectCard";
import type { Project } from "@/types/database";

export const dynamic = "force-dynamic";

async function fetchProjects() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const select = encodeURIComponent(
    "*,manager:users!projects_manager_id_fkey(id,full_name,avatar_url),members:project_members(user:users(id,full_name,avatar_url,role)),statuses:project_statuses(id,name,color,position),task_count:tasks(count)"
  );
  const res = await fetch(`${url}/rest/v1/projects?select=${select}&order=name`, {
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ProyectosPage() {
  noStore();

  const projects = await fetchProjects();

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Proyectos" subtitle="Todos los proyectos de la agencia" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
          {projects?.map((project) => (
            <ProjectCard key={project.id} project={project as any} />
          ))}
          {(!projects || projects.length === 0) && (
            <div className="col-span-3 text-center py-20 text-white/30 text-sm">
              No hay proyectos disponibles
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
