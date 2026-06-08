import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { ClientesClient } from "@/components/admin/ClientesClient";
import type { Client, Project } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/proyectos");

  const supabase = createAdminClient();

  const [{ data: clients }, { data: projects }, { data: clientProjects }] =
    await Promise.all([
      supabase.from("clients").select("*").order("name"),
      supabase.from("projects").select("id, name, color, slug").order("name"),
      supabase.from("client_projects").select("client_id, project_id"),
    ]);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Clientes"
        subtitle={`${clients?.length ?? 0} clientes registrados`}
      />
      <ClientesClient
        clients={(clients ?? []) as Client[]}
        projects={(projects ?? []) as Project[]}
        clientProjects={(clientProjects ?? []) as { client_id: string; project_id: string }[]}
      />
    </div>
  );
}
