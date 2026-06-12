import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { ProjectManager } from "@/components/projects/ProjectManager";
import { ArrowRight } from "lucide-react";
import type { Client, User } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { projectId } = await params;
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [projectRows, clientProjectsRows, membersRows, allClientsRows, allUsersRows] = await Promise.all([
    sql`SELECT * FROM projects WHERE id = ${projectId} LIMIT 1`,
    sql`
      SELECT c.id, c.name, c.color, c.company, c.email
      FROM client_projects cp
      JOIN clients c ON c.id = cp.client_id
      WHERE cp.project_id = ${projectId}
      ORDER BY c.name
    `,
    sql`
      SELECT u.id, u.full_name, u.avatar_url, u.job_title
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ${projectId}
      ORDER BY u.full_name
    `,
    sql`SELECT id, name, color, company FROM clients ORDER BY name`,
    sql`SELECT id, full_name, avatar_url, job_title FROM users ORDER BY full_name`,
  ]);

  if (!projectRows[0]) notFound();
  const project = projectRows[0] as any;
  const clients = clientProjectsRows as unknown as Client[];

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={project.name}
        subtitle={`${clients.length} ${clients.length === 1 ? "cliente" : "clientes"}`}
      />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Clientes / kanban cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/proyectos/${projectId}/${client.id}`}
              className="group bg-[#1a1a2e] border border-white/8 rounded-xl p-5 hover:border-white/15 hover:bg-[#1e1e35] transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: (client as any).color + "33", border: `1px solid ${(client as any).color}40` }}
                >
                  <span style={{ color: (client as any).color }}>{client.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{client.name}</h3>
                  {(client as any).company && (
                    <p className="text-xs text-white/40 truncate mt-0.5">{(client as any).company}</p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: project.color + "20", color: project.color }}
                >
                  {project.name}
                </span>
                {(client as any).email && (
                  <span className="text-xs text-white/30 truncate">{(client as any).email}</span>
                )}
              </div>
            </Link>
          ))}

          {clients.length === 0 && (
            <div className="col-span-3 text-center py-16 text-white/30 text-sm">
              Sin clientes asignados — agrega uno en la sección de abajo
            </div>
          )}
        </div>

        {/* Gestión de equipo y clientes (admin) */}
        <ProjectManager
          projectId={projectId}
          isAdmin={isAdmin}
          assignedClients={clientProjectsRows as unknown as any[]}
          allClients={allClientsRows as unknown as any[]}
          members={membersRows as unknown as User[]}
          allUsers={allUsersRows as unknown as User[]}
        />
      </div>
    </div>
  );
}
