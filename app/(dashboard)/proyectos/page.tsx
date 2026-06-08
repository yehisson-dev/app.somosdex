import { unstable_noStore as noStore } from "next/cache";
import sql from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { ProjectCard } from "@/components/projects/ProjectCard";

export const dynamic = "force-dynamic";

async function fetchProjects() {
  try {
    const rows = await sql`
      SELECT
        p.*,
        row_to_json(m.*) AS manager,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'user', jsonb_build_object(
              'id', u.id, 'full_name', u.full_name,
              'avatar_url', u.avatar_url, 'role', u.role
            )
          )) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) AS members,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', ps.id, 'name', ps.name,
            'color', ps.color, 'position', ps.position
          )) FILTER (WHERE ps.id IS NOT NULL),
          '[]'
        ) AS statuses,
        COUNT(DISTINCT t.id) AS task_count
      FROM projects p
      LEFT JOIN users m ON m.id = p.manager_id
      LEFT JOIN project_members pm ON pm.project_id = p.id
      LEFT JOIN users u ON u.id = pm.user_id
      LEFT JOIN project_statuses ps ON ps.project_id = p.id
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY p.id, m.id
      ORDER BY p.name
    `;
    return rows;
  } catch (e) {
    console.error("[proyectos] fetchProjects error:", e);
    return [];
  }
}

export default async function ProyectosPage() {
  noStore();
  const projects = await fetchProjects();

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Proyectos" subtitle="Todos los proyectos de la agencia" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
          {projects?.map((project: any) => (
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
