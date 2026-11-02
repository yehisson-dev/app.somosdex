import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";

// GET — carga el cliente y sus posts "aprobados" pendientes de revisión del cliente
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const clientRows = await sql`
    SELECT id, name, company, color
    FROM clients
    WHERE content_approval_token = ${token}::uuid
    LIMIT 1
  `.catch(() => []);

  if (!clientRows[0]) return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  const client = clientRows[0] as any;

  // Traer todos los posts aprobados por el equipo (status = 'aprobado')
  // ordenados por fecha de publicación
  const posts = await sql`
    SELECT
      cp.id, cp.caption, cp.description, cp.post_type,
      cp.media_urls, cp.client_approval, cp.client_comment,
      cp.client_approved_at,
      to_char(cp.publish_date, 'YYYY-MM-DD') AS publish_date,
      plan.platform
    FROM content_posts cp
    JOIN content_plans plan ON plan.id = cp.plan_id
    WHERE plan.client_id = ${client.id}
      AND cp.status = 'aprobado'
    ORDER BY cp.publish_date ASC NULLS LAST, cp.created_at ASC
  `.catch(() => []);

  return NextResponse.json({ client, posts });
}

// PATCH — cliente aprueba o rechaza un post
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { postId, action, comment } = await req.json();

  if (!postId || !["approved", "rejected"].includes(action)) {
    return NextResponse.json({ error: "postId y action requeridos" }, { status: 400 });
  }

  // Verificar que el token corresponde al cliente dueño del post
  const clientRows = await sql`
    SELECT c.id, c.name
    FROM clients c
    WHERE c.content_approval_token = ${token}::uuid
    LIMIT 1
  `.catch(() => []);

  if (!clientRows[0]) return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  const client = clientRows[0] as any;

  await sql`
    UPDATE content_posts SET
      client_approval     = ${action},
      client_comment      = ${comment ?? null},
      client_approved_at  = now(),
      updated_at          = now()
    WHERE id = ${postId}
      AND plan_id IN (
        SELECT id FROM content_plans WHERE client_id = ${client.id}
      )
  `;

  // Notificar a admins/PMs del equipo
  const teamRows = await sql`
    SELECT u.id, u.email, u.full_name
    FROM users u
    WHERE u.role IN ('admin', 'project_manager')
  `.catch(() => []);

  const postRows = await sql`
    SELECT caption, description FROM content_posts WHERE id = ${postId} LIMIT 1
  `.catch(() => []);
  const postCaption = (postRows[0] as any)?.caption ?? (postRows[0] as any)?.description ?? "Sin título";

  const actionLabel = action === "approved" ? "✅ aprobó" : "❌ rechazó";
  const notifTitle  = `${client.name} ${actionLabel} una pieza de contenido`;
  const notifBody   = `"${postCaption.slice(0, 80)}"${comment ? ` · Comentario: ${comment}` : ""}`;

  for (const u of teamRows as any[]) {
    if (!u.email) continue;
    await sql`
      INSERT INTO notifications (user_id, type, title, body)
      VALUES (${u.id}, 'task_comment', ${notifTitle}, ${notifBody})
    `.catch(() => {});
    sendNotificationEmail({
      to: u.email,
      userName: u.full_name ?? u.email,
      type: "task_comment",
      title: notifTitle,
      taskTitle: notifBody,
      senderName: client.name,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
