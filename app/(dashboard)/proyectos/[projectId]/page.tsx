import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { Users, ListTodo, ArrowRight } from "lucide-react";
import type { Client } from "@/types/database";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { projectId } = await params;
  const supabase = createAdminClient();

  const { data: projectRaw } = await supabase
    .from("projects")
    .select("*, manager:users!projects_manager_id_fkey(id, full_name)")
    .eq("id", projectId)
    .single();

  if (!projectRaw) notFound();
  const project = projectRaw as any;

  const { data: clientProjects } = await supabase
    .from("client_projects")
    .select("client:clients(*)")
    .eq("project_id", projectId);

  const clients = (clientProjects?.map((cp: any) => cp.client).filter(Boolean) ?? []) as Client[];

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={project.name}
        subtitle={`${clients.length} clientes activos`}
      />
      <div className="flex-1 overflow-y-auto p-6">
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
                  style={{ backgroundColor: client.color + "33", border: `1px solid ${client.color}40` }}
                >
                  <span style={{ color: client.color }}>{client.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{client.name}</h3>
                  {client.company && (
                    <p className="text-xs text-white/40 truncate mt-0.5">{client.company}</p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: project.color + "20", color: project.color }}>
                  {project.name}
                </span>
                {client.email && (
                  <span className="text-xs text-white/30 truncate">{client.email}</span>
                )}
              </div>
            </Link>
          ))}
          {clients.length === 0 && (
            <div className="col-span-3 text-center py-20 text-white/30 text-sm">
              Sin clientes asignados a este proyecto
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
