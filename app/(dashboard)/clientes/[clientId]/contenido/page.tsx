import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { ContentPlanManager } from "@/components/contenido/ContentPlanManager";
import type { Client, ContentPlan, Project } from "@/types/database";

interface Props { params: Promise<{ clientId: string }> }

export default async function ContentPlanPage({ params }: Props) {
  const { clientId } = await params;
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "admin" && role !== "project_manager") redirect("/proyectos");

  const supabase = createAdminClient();

  const [{ data: client }, { data: plans }, { data: projects }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase
      .from("content_plans")
      .select(`*, posts:content_posts(*, comments:content_post_comments(*))`)
      .eq("client_id", clientId)
      .order("created_at"),
    supabase.from("projects").select("id, name, color").order("name"),
  ]);

  if (!client) notFound();

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={`Plan de Contenido · ${(client as Client).name}`}
        subtitle={`${plans?.length ?? 0} plataformas`}
      />
      <ContentPlanManager
        client={client as Client}
        initialPlans={(plans ?? []) as ContentPlan[]}
        projects={(projects ?? []) as Project[]}
      />
    </div>
  );
}
