import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { title, assignee_id, due_date, priority } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "title requerido" }, { status: 400 });

  // Heredar project_id, client_id y status_id del padre
  const parentRows = await sql`
    SELECT project_id, client_id, status_id FROM tasks WHERE id = ${taskId} LIMIT 1
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

  // Adjuntar assignee si se asignó
  if (task.assignee_id) {
    const uRows = await sql`SELECT id, full_name, avatar_url FROM users WHERE id = ${task.assignee_id} LIMIT 1`;
    task.assignee = uRows[0] ?? null;
  } else {
    task.assignee = null;
  }

  return NextResponse.json(task);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { subtaskId, title, status_id, assignee_id, due_date, priority } = await req.json();
  if (!subtaskId) return NextResponse.json({ error: "subtaskId requerido" }, { status: 400 });

  await sql`
    UPDATE tasks SET
      title       = COALESCE(${title ?? null}, title),
      status_id   = CASE WHEN ${status_id !== undefined} THEN ${status_id ?? null} ELSE status_id END,
      assignee_id = CASE WHEN ${assignee_id !== undefined} THEN ${assignee_id ?? null} ELSE assignee_id END,
      due_date    = CASE WHEN ${due_date !== undefined} THEN ${due_date ?? null} ELSE due_date END,
      priority    = CASE WHEN ${priority !== undefined} THEN ${priority ?? 'medium'} ELSE priority END
    WHERE id = ${subtaskId} AND parent_task_id = ${taskId}
  `;
  return NextResponse.json({ ok: true });
}

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
