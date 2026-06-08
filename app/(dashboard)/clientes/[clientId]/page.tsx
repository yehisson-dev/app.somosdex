import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { ClientProfileDashboard } from "@/components/admin/ClientProfileDashboard";
import type { Client, Project } from "@/types/database";

interface Props { params: Promise<{ clientId: string }> }

export default async function ClientProfilePage({ params }: Props) {
  const { clientId } = await params;
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/proyectos");

  const supabase = createAdminClient();

  const [
    { data: client },
    { data: projects },
    { data: clientProjects },
    { data: whiteboards },
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("projects").select("id, name, color, slug").order("name"),
    supabase.from("client_projects").select("client_id, project_id").eq("client_id", clientId),
    supabase
      .from("whiteboards")
      .select("id, name, description, updated_at")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false }),
  ]);

  if (!client) notFound();

  return (
    <ClientProfileDashboard
      client={client as Client}
      projects={(projects ?? []) as Project[]}
      initialAssigned={(clientProjects ?? []).map((cp) => cp.project_id)}
      whiteboards={(whiteboards ?? []) as any[]}
    />
  );
}
