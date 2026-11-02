import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function insertNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  taskId: string
) {
  await sql`
    INSERT INTO notifications (user_id, type, title, body, task_id)
    VALUES (${userId}, ${type}, ${title}, ${body}, ${taskId})
  `;
}

async function notifyUser(opts: {
  userId: string;
  type: string;
  title: string;
  body: string;
  taskId: string;
  senderName: string;
}) {
  const { userId, type, title, body, taskId, senderName } = opts;
  await insertNotification(userId, type, title, body, taskId);

  const rows = await sql`SELECT email, full_name FROM users WHERE id = ${userId} LIMIT 1`;
  const u = rows[0] as { email: string; full_name: string } | undefined;
  if (!u?.email) return;

  sendNotificationEmail({
    to: u.email,
    userName: u.full_name ?? u.email,
    type,
    title,
    taskTitle: body,
    taskUrl: `/tareas/${taskId}`,
    senderName,
  }).catch(() => {});
}

// ─── POST: crear subtarea ────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { title, assignee_id, due_date, priority } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "title requerido" }, { status: 400 });

  const parentRows = await sql`
    SELECT t.project_id, t.client_id, t.status_id, t.title AS parent_title, t.created_by,
           t.assignee_id AS parent_assignee_id
    FROM tasks t WHERE t.id = ${taskId} LIMIT 1
  `;
  if (!parentRows[0]) return NextResponse.json({ error: "Tarea padre no encontrada" }, { status: 404 });
  const parent = parentRows[0] as any;

  const rows = await sql`
    INSERT INTO tasks (title, project_id, client_id, status_id, parent_task_id, priority, assignee_id, due_date, created_by)
    VALUES (
      ${title.trim()},
      ${parent.project_id},
      ${parent.client_id ?? null},
      ${parent.status_id ?? null},
      ${taskId},
      ${priority ?? 'none'},
      ${assignee_id ?? null},
      ${due_date ?? null},
      ${session.user.id}
    )
    RETURNING id, title, priority, status_id, assignee_id, to_char(due_date,'YYYY-MM-DD') AS due_date, created_at, parent_task_id
  `;

  const task = rows[0] as any;

  if (task.assignee_id) {
    const uRows = await sql`SELECT id, full_name, avatar_url FROM users WHERE id = ${task.assignee_id} LIMIT 1`;
    task.assignee = uRows[0] ?? null;

    // Notificar al asignado (solo si es diferente al creador)
    if (task.assignee_id !== session.user.id) {
      await notifyUser({
        userId: task.assignee_id,
        type: "subtask_assigned",
        title: `Te asignaron una subtarea: "${task.title}"`,
        body: `Tarea padre: ${parent.parent_title}`,
        taskId,
        senderName: session.user.name ?? "Alguien",
      });
    }
  } else {
    task.assignee = null;
  }

  return NextResponse.json(task);
}

// ─── PATCH: actualizar subtarea ──────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { subtaskId, title, status_id, assignee_id, due_date, priority, description } = await req.json();
  if (!subtaskId) return NextResponse.json({ error: "subtaskId requerido" }, { status: 400 });

  // Leer estado anterior para comparar cambios
  const prevRows = await sql`
    SELECT st.assignee_id AS prev_assignee_id, st.status_id AS prev_status_id, st.title AS subtask_title,
           ps.name AS prev_status_name,
           t.title AS parent_title, t.created_by AS parent_created_by, t.assignee_id AS parent_assignee_id
    FROM tasks st
    JOIN tasks t ON t.id = st.parent_task_id
    LEFT JOIN project_statuses ps ON ps.id = st.status_id
    WHERE st.id = ${subtaskId} AND st.parent_task_id = ${taskId}
    LIMIT 1
  `;
  const prev = prevRows[0] as any;

  await sql`
    UPDATE tasks SET
      title       = COALESCE(${title ?? null}, title),
      status_id   = CASE WHEN ${status_id !== undefined} THEN ${status_id ?? null} ELSE status_id END,
      assignee_id = CASE WHEN ${assignee_id !== undefined} THEN ${assignee_id ?? null} ELSE assignee_id END,
      due_date    = CASE WHEN ${due_date !== undefined} THEN ${due_date ?? null} ELSE due_date END,
      priority    = CASE WHEN ${priority !== undefined} THEN ${priority ?? 'medium'} ELSE priority END,
      description = CASE WHEN ${description !== undefined} THEN ${description ?? null} ELSE description END,
      updated_at  = now()
    WHERE id = ${subtaskId} AND parent_task_id = ${taskId}
  `;

  if (prev) {
    const senderName = session.user.name ?? "Alguien";
    const subTitle = title ?? prev.subtask_title;
    const parentTitle = prev.parent_title;

    // ── Cambio de estatus ──────────────────────────────────────────────────
    if (status_id !== undefined && status_id !== prev.prev_status_id) {
      // Obtener nombre del nuevo estatus
      const newStatusRows = status_id
        ? await sql`SELECT name FROM project_statuses WHERE id = ${status_id} LIMIT 1`
        : [];
      const newStatusName = (newStatusRows[0] as any)?.name ?? "Sin estado";

      const notifTitle = `Subtarea actualizada: "${subTitle}"`;
      const notifBody  = `Estado → ${newStatusName} · Tarea: ${parentTitle}`;

      // Notificar al asignado actual de la subtarea (puede ser el anterior o el nuevo)
      const currentAssignee = assignee_id !== undefined ? assignee_id : prev.prev_assignee_id;
      if (currentAssignee && currentAssignee !== session.user.id) {
        await notifyUser({ userId: currentAssignee, type: "subtask_status", title: notifTitle, body: notifBody, taskId, senderName });
      }

      // Notificar al creador/asignado de la tarea padre si es diferente
      const notifyParent = prev.parent_created_by;
      if (notifyParent && notifyParent !== session.user.id && notifyParent !== currentAssignee) {
        await notifyUser({ userId: notifyParent, type: "subtask_status", title: notifTitle, body: notifBody, taskId, senderName });
      }

      // También al assignee de la tarea padre si es diferente
      if (
        prev.parent_assignee_id &&
        prev.parent_assignee_id !== session.user.id &&
        prev.parent_assignee_id !== currentAssignee &&
        prev.parent_assignee_id !== notifyParent
      ) {
        await notifyUser({ userId: prev.parent_assignee_id, type: "subtask_status", title: notifTitle, body: notifBody, taskId, senderName });
      }
    }

    // ── Cambio de asignado ─────────────────────────────────────────────────
    if (assignee_id !== undefined && assignee_id !== prev.prev_assignee_id) {
      // Notificar al nuevo asignado
      if (assignee_id && assignee_id !== session.user.id) {
        await notifyUser({
          userId: assignee_id,
          type: "subtask_assigned",
          title: `Te asignaron la subtarea: "${subTitle}"`,
          body: `Tarea padre: ${parentTitle}`,
          taskId,
          senderName,
        });
      }

      // Notificar al asignado anterior que fue removido
      if (prev.prev_assignee_id && prev.prev_assignee_id !== session.user.id && prev.prev_assignee_id !== assignee_id) {
        await notifyUser({
          userId: prev.prev_assignee_id,
          type: "subtask_unassigned",
          title: `Te removieron de la subtarea: "${subTitle}"`,
          body: `Tarea padre: ${parentTitle}`,
          taskId,
          senderName,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

// ─── DELETE: eliminar subtarea ───────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { subtaskId } = await req.json();
  if (!subtaskId) return NextResponse.json({ error: "subtaskId requerido" }, { status: 400 });

  await sql`DELETE FROM tasks WHERE id = ${subtaskId} AND parent_task_id = ${taskId}`;
  return NextResponse.json({ ok: true });
}
