import { notFound } from "next/navigation";
import sql from "@/lib/db";
import { PublicPlanView } from "@/components/contenido/PublicPlanView";
import type { ContentPlan } from "@/types/database";

interface Props { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  const rows = await sql`
    SELECT cp.title, c.name AS client_name
    FROM content_plans cp
    LEFT JOIN clients c ON c.id = cp.client_id
    WHERE cp.share_token = ${token}::uuid
    LIMIT 1
  `.catch(() => []);
  if (!rows[0]) return { title: "Plan de contenido" };
  const row = rows[0] as any;
  return {
    title: `${row.title} · ${row.client_name ?? ""}`,
    description: "Plan de contenido para revisión y aprobación",
  };
}

export default async function PublicPlanPage({ params }: Props) {
  const { token } = await params;

  const planRows = await sql`
    SELECT
      cp.*,
      json_build_object('id', c.id, 'name', c.name, 'color', c.color, 'logo_url', c.logo_url) AS client,
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', p.id, 'plan_id', p.plan_id, 'media_urls', p.media_urls,
            'publish_date', p.publish_date, 'description', p.description,
            'caption', p.caption, 'post_type', p.post_type, 'status', p.status,
            'position', p.position, 'created_at', p.created_at, 'updated_at', p.updated_at,
            'comments', COALESCE((
              SELECT json_agg(
                json_build_object('id', pc.id, 'post_id', pc.post_id, 'content', pc.content,
                  'author_name', pc.author_name, 'is_client', pc.is_client, 'created_at', pc.created_at)
                ORDER BY pc.created_at
              ) FROM content_post_comments pc WHERE pc.post_id = p.id
            ), '[]')
          ) ORDER BY p.position, p.publish_date
        ) FROM content_posts p WHERE p.plan_id = cp.id
      ), '[]') AS posts
    FROM content_plans cp
    LEFT JOIN clients c ON c.id = cp.client_id
    WHERE cp.share_token = ${token}::uuid
    LIMIT 1
  `;

  if (!planRows[0]) notFound();
  const plan = planRows[0] as any;

  if (!plan.is_published) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
            <span className="text-2xl">🔒</span>
          </div>
          <p className="text-white font-medium">Plan no disponible aún</p>
          <p className="text-white/40 text-sm">Tu agencia está preparando el plan. Vuelve pronto.</p>
        </div>
      </div>
    );
  }

  return <PublicPlanView plan={plan as ContentPlan} token={token} />;
}
