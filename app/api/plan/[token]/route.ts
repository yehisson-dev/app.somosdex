import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Platform → project keyword mapping
const PLATFORM_PROJECT_KEYWORD: Record<string, string> = {
  instagram: "social",
  tiktok:    "social",
  twitter:   "social",
  facebook:  "social",
  youtube:   "social",
  linkedin:  "social",
  blog:      "seo",
  podcast:   "evento",
};

const MONTHS_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];

/**
 * After a client approves a post, create a task in the matching project.
 * Errors here are non-fatal — approval still succeeds even if task creation fails.
 */
async function createTaskFromApproval(opts: {
  platform: string;
  clientId: string;
  postType: string | null;
  publishDate: string | null;
  caption: string | null;
}) {
  const supabase = createAdminClient();

  const keyword = PLATFORM_PROJECT_KEYWORD[opts.platform.toLowerCase()];
  if (!keyword) return;

  // Find project whose name contains the keyword (case-insensitive)
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .ilike("name", `%${keyword}%`)
    .limit(1);

  const project = projects?.[0];
  if (!project) return;

  // Get first status of that project (lowest position = "pendiente")
  const { data: statuses } = await supabase
    .from("project_statuses")
    .select("id")
    .eq("project_id", project.id)
    .order("position", { ascending: true })
    .limit(1);

  const statusId = statuses?.[0]?.id ?? null;

  // Build task title: "Reel 12 de junio"
  const date = opts.publishDate ? new Date(opts.publishDate) : new Date();
  const day   = date.getUTCDate();
  const month = MONTHS_ES[date.getUTCMonth()];
  const type  = opts.postType?.trim() || opts.platform;
  const title = `${type} ${day} de ${month}`;

  await supabase.from("tasks").insert({
    title,
    project_id:   project.id,
    status_id:    statusId,
    client_id:    opts.clientId,
    priority:     "medium",
    position:     0,
    content:      opts.caption || null,
    content_type: "text",
  } as any);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { postId, action, content, authorName } = body as {
    postId: string;
    action: "approve" | "reject" | "comment";
    content?: string;
    authorName: string;
  };

  if (!postId || !action || !authorName) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Validate token → plan → post ownership
  const { data: plan } = await supabase
    .from("content_plans")
    .select("id, platform, client_id")
    .eq("share_token", token)
    .eq("is_published", true)
    .single();

  if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

  const { data: post } = await supabase
    .from("content_posts")
    .select("id, post_type, publish_date, caption")
    .eq("id", postId)
    .eq("plan_id", plan.id)
    .single();

  if (!post) return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });

  // Execute action
  if (action === "approve") {
    await supabase.from("content_posts").update({ status: "approved" } as any).eq("id", postId);
    await supabase.from("content_post_comments").insert({
      post_id:     postId,
      content:     "✅ Publicación aprobada",
      author_name: authorName,
      is_client:   true,
    } as any);

    // Create task in the matching project (fire-and-forget, non-fatal)
    createTaskFromApproval({
      platform:    (plan as any).platform,
      clientId:    (plan as any).client_id,
      postType:    (post as any).post_type,
      publishDate: (post as any).publish_date,
      caption:     (post as any).caption,
    }).catch((err) => console.error("[plan/approve] Error creando tarea:", err));

  } else if (action === "reject") {
    await supabase.from("content_posts").update({ status: "rejected" } as any).eq("id", postId);
    if (content?.trim()) {
      await supabase.from("content_post_comments").insert({
        post_id:     postId,
        content,
        author_name: authorName,
        is_client:   true,
      } as any);
    }
  } else if (action === "comment") {
    if (!content?.trim()) return NextResponse.json({ error: "Comentario vacío" }, { status: 400 });
    await supabase.from("content_post_comments").insert({
      post_id:     postId,
      content,
      author_name: authorName,
      is_client:   true,
    } as any);
  }

  // Return fresh post data
  const { data: updated } = await supabase
    .from("content_posts")
    .select("*, comments:content_post_comments(*)")
    .eq("id", postId)
    .single();

  return NextResponse.json({ post: updated });
}
