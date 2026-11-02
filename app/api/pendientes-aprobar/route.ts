import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ tasks: [] });

  // Tasks I am the APPROVER of, excluding statuses that mean "already handled"
  const tasks = await sql`
    SELECT
      t.id, t.title, t.priority,
      to_char(t.due_date, 'YYYY-MM-DD')       AS due_date,
      to_char(t.scheduled_date, 'YYYY-MM-DD') AS scheduled_date,
      t.assignee_id, t.approver_id,
      CASE WHEN c.id IS NOT NULL THEN json_build_object('id',c.id,'name',c.name,'color',c.color) END AS client,
      CASE WHEN p.id IS NOT NULL THEN json_build_object('id',p.id,'name',p.name,'color',p.color) END AS project,
      CASE WHEN s.id IS NOT NULL THEN json_build_object('id',s.id,'name',s.name,'color',s.color) END AS status,
      CASE WHEN u.id IS NOT NULL THEN json_build_object('id',u.id,'name',u.full_name,'avatar',u.avatar_url) END AS assignee
    FROM tasks t
    LEFT JOIN clients c          ON c.id = t.client_id
    LEFT JOIN projects p         ON p.id = t.project_id
    LEFT JOIN project_statuses s ON s.id = t.status_id
    LEFT JOIN users u            ON u.id = t.assignee_id
    WHERE t.approver_id = ${userId}
      AND t.assignee_id != ${userId}   -- exclude tasks where I'm also the assignee (those show in mis-tareas)
      AND t.parent_task_id IS NULL
      AND (
        s.name IS NULL
        OR (
          s.name NOT ILIKE '%programad%'
          AND s.name NOT ILIKE '%aprobad%'
          AND s.name NOT ILIKE '%publicad%'
          AND s.name NOT ILIKE '%completad%'
        )
      )
    ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
  `;

  return NextResponse.json({ tasks });
}
