import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";

export const dynamic = "force-dynamic";
import { UsuariosClient } from "@/components/admin/UsuariosClient";
import type { User, Project, Client } from "@/types/database";

export default async function UsuariosPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/proyectos");

  const supabase = createAdminClient();

  const [
    { data: users },
    { data: projects },
    { data: members },
    { data: clientProjects },
    { data: memberClients },
  ] = await Promise.all([
    supabase.from("users").select("*").order("full_name"),
    supabase.from("projects").select("id, name, color, slug").order("name"),
    supabase.from("project_members").select("project_id, user_id"),
    // clientes con su proyecto
    supabase.from("client_projects").select("project_id, client:clients(id, name, color)"),
    // asignaciones usuario ↔ cliente
    supabase.from("member_clients").select("project_id, user_id, client_id"),
  ]);

  // Agrupar clientes por proyecto
  const clientsByProject: Record<string, Client[]> = {};
  for (const row of (clientProjects ?? []) as any[]) {
    if (!row.client) continue;
    if (!clientsByProject[row.project_id]) clientsByProject[row.project_id] = [];
    clientsByProject[row.project_id].push(row.client as Client);
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Usuarios"
        subtitle={`${users?.length ?? 0} miembros del equipo`}
      />
      <UsuariosClient
        users={(users ?? []) as User[]}
        projects={(projects ?? []) as Project[]}
        memberships={(members ?? []) as { project_id: string; user_id: string }[]}
        clientsByProject={clientsByProject}
        memberClients={(memberClients ?? []) as { project_id: string; user_id: string; client_id: string }[]}
      />
    </div>
  );
}
