import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { ContentPlanManager } from "@/components/contenido/ContentPlanManager";
import type { Client, ContentPlan, Project } from "@/types/database";

interface Props { params: Promise<{ clientId: string }> }

export const dynamic = "force-dynamic";

export default async function ContentPlanPage({ params }: Props) {
  const { clientId } = await params;
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "admin" && role !== "project_manager") redirect("/proyectos");

  const [clients, plans, projects] = await Promise.all([
    sql`SELECT * FROM clients WHERE id = ${clientId} LIMIT 1`,
    sql`
      SELECT
        cp.*,
        COALESCE(json_agg(
          json_build_object(
            'id', p.id,
            'plan_id', p.plan_id,
            'media_urls', p.media_urls,
            'publish_date', to_char(p.publish_date, 'YYYY-MM-DD'),
            'post_type', p.post_type,
            'caption', p.caption,
            'description', p.description,
            'status', p.status,
            'position', p.position,
            'created_at', p.created_at,
            'comments', COALESCE((
              SELECT json_agg(json_build_object(
                'id', c.id,
                'content', c.content,
                'author_name', c.author_name,
                'is_client', c.is_client,
                'created_at', c.created_at
              ) ORDER BY c.created_at ASC)
              FROM content_post_comments c WHERE c.post_id = p.id
            ), '[]')
          ) ORDER BY p.position ASC, p.publish_date ASC NULLS LAST
        ) FILTER (WHERE p.id IS NOT NULL), '[]') AS posts
      FROM content_plans cp
      LEFT JOIN content_posts p ON p.plan_id = cp.id
      WHERE cp.client_id = ${clientId}
      GROUP BY cp.id
      ORDER BY cp.created_at ASC
    `,
    sql`SELECT id, name, color FROM projects ORDER BY name`,
  ]);

  const client = clients[0];
  if (!client) notFound();

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={`Plan de Contenido · ${(client as Client).name}`}
        subtitle={`${plans.length} plataformas`}
      />
      <ContentPlanManager
        client={client as Client}
        initialPlans={plans as unknown as ContentPlan[]}
        projects={projects as Project[]}
      />
    </div>
  );
}
