import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

const PLATFORM_PROJECT_KEYWORD: Record<string, string> = {
  instagram: "social", tiktok: "social", twitter: "social",
  facebook: "social",  youtube: "social", linkedin: "social",
  blog: "seo", podcast: "evento",
};

const MONTHS_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];

async function createTaskFromApproval(opts: {
  platform: string; clientId: string;
  postType: string | null; publishDate: string | null; caption: string | null;
}) {
  const keyword = PLATFORM_PROJECT_KEYWORD[opts.platform.toLowerCase()];
  if (!keyword) return;

  const projects = await sql`SELECT id FROM projects WHERE name ILIKE ${"%" + keyword + "%"} LIMIT 1`;
  const project = projects[0] as any;
  if (!project) return;

  const statuses = await sql`SELECT id FROM project_statuses WHERE project_id = ${project.id} ORDER BY position ASC LIMIT 1`;
  const statusId = (statuses[0] as any)?.id ?? null;

  const date  = opts.publishDate ? new Date(opts.publishDate) : new Date();
  const day   = date.getUTCDate();
  const month = MONTHS_ES[date.getUTCMonth()];
  const type  = opts.postType?.trim() || opts.platform;
  const title = `${type} ${day} de ${month}`;

  await sql`
    INSERT INTO tasks (title, project_id, status_id, client_id, priority, position, content, content_type)
    VALUES (${title}, ${project.id}, ${statusId}, ${opts.clientId}, 'medium', 0, ${opts.caption ?? null}, 'text')
  `;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { postId, action, content, authorName } = body as {
    postId: string; action: "approve" | "reject" | "comment";
    content?: string; authorName: string;
  };

  if (!postId || !action || !authorName)
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  // Validar token → plan publicado
  const plans = await sql`
    SELECT id, platform, client_id FROM content_plans
    WHERE share_token = ${token} AND is_published = true
    LIMIT 1
  `;
  const plan = plans[0] as any;
  if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

  // Validar que el post pertenece al plan
  const posts = await sql`
    SELECT id, post_type, to_char(publish_date,'YYYY-MM-DD') AS publish_date, caption
    FROM content_posts WHERE id = ${postId} AND plan_id = ${plan.id} LIMIT 1
  `;
  const post = posts[0] as any;
  if (!post) return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });

  if (action === "approve") {
    await sql`UPDATE content_posts SET status = 'approved' WHERE id = ${postId}`;
    await sql`
      INSERT INTO content_post_comments (post_id, content, author_name, is_client)
      VALUES (${postId}, '✅ Publicación aprobada', ${authorName}, true)
    `;
    createTaskFromApproval({
      platform: plan.platform, clientId: plan.client_id,
      postType: post.post_type, publishDate: post.publish_date, caption: post.caption,
    }).catch((err) => console.error("[plan/approve] Error creando tarea:", err));

  } else if (action === "reject") {
    await sql`UPDATE content_posts SET status = 'rejected' WHERE id = ${postId}`;
    if (content?.trim()) {
      await sql`
        INSERT INTO content_post_comments (post_id, content, author_name, is_client)
        VALUES (${postId}, ${content}, ${authorName}, true)
      `;
    }
  } else if (action === "comment") {
    if (!content?.trim()) return NextResponse.json({ error: "Comentario vacío" }, { status: 400 });
    await sql`
      INSERT INTO content_post_comments (post_id, content, author_name, is_client)
      VALUES (${postId}, ${content}, ${authorName}, true)
    `;
  }

  // Devolver post actualizado
  const updated = await sql`
    SELECT p.*,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', c.id, 'content', c.content, 'author_name', c.author_name,
          'is_client', c.is_client, 'created_at', c.created_at
        ) ORDER BY c.created_at)
        FROM content_post_comments c WHERE c.post_id = p.id
      ), '[]') AS comments
    FROM content_posts p WHERE p.id = ${postId} LIMIT 1
  `;

  return NextResponse.json({ post: updated[0] });
}
