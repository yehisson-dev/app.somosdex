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
  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "title requerido" }, { status: 400 });

  // Heredar project_id, client_id y status_id del padre
  const parentRows = await sql`
    SELECT project_id, client_id, status_id FROM tasks WHERE id = ${taskId} LIMIT 1
  `;
  if (!parentRows[0]) return NextResponse.json({ error: "Tarea padre no encontrada" }, { status: 404 });
  const parent = parentRows[0] as any;

  const rows = await sql`
    INSERT INTO tasks (title, project_id, client_id, status_id, parent_task_id, priority, created_by)
    VALUES (
      ${title.trim()},
      ${parent.project_id},
      ${parent.client_id ?? null},
      ${parent.status_id ?? null},
      ${taskId},
      'medium',
      ${session.user.id}
    )
    RETURNING id, title, priority, status_id, assignee_id, due_date, created_at, parent_task_id
  `;

  return NextResponse.json(rows[0]);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { subtaskId, title, status_id, assignee_id, due_date } = await req.json();
  if (!subtaskId) return NextResponse.json({ error: "subtaskId requerido" }, { status: 400 });

  const updates: string[] = [];
  if (title !== undefined) updates.push(`title = '${title.replace(/'/g, "''")}'`);
  if (status_id !== undefined) updates.push(status_id ? `status_id = '${status_id}'` : `status_id = NULL`);
  if (assignee_id !== undefined) updates.push(assignee_id ? `assignee_id = '${assignee_id}'` : `assignee_id = NULL`);
  if (due_date !== undefined) updates.push(due_date ? `due_date = '${due_date}'` : `due_date = NULL`);

  if (updates.length === 0) return NextResponse.json({ ok: true });

  await sql.unsafe(`UPDATE tasks SET ${updates.join(", ")} WHERE id = '${subtaskId}' AND parent_task_id = '${taskId}'`);
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
