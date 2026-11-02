import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/kpis/late-tasks?user_id=xxx&month=7&year=2026
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const month  = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const year   = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()));

  if (!userId) return NextResponse.json({ error: "user_id requerido" }, { status: 400 });

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate   = new Date(year, month, 0).toISOString().slice(0, 10);

  const tasks = await sql`
    SELECT
      t.id, t.title, t.priority,
      to_char(t.due_date,   'YYYY-MM-DD') AS due_date,
      to_char(t.updated_at::date, 'YYYY-MM-DD') AS completed_date,
      CASE
        WHEN s.name ILIKE '%programad%' OR s.name ILIKE '%aprobad%'
          OR s.name ILIKE '%publicad%'  OR s.name ILIKE '%completad%'
        THEN 'done'
        ELSE 'open'
      END AS completion_state,
      s.name  AS status_name,
      s.color AS status_color,
      CASE WHEN c.id IS NOT NULL THEN json_build_object('id',c.id,'name',c.name,'color',c.color) END AS client,
      CASE WHEN p.id IS NOT NULL THEN json_build_object('id',p.id,'name',p.name,'color',p.color) END AS project
    FROM tasks t
    LEFT JOIN project_statuses s ON s.id = t.status_id
    LEFT JOIN clients c          ON c.id = t.client_id
    LEFT JOIN projects p         ON p.id = t.project_id
    WHERE t.assignee_id = ${userId}
      AND t.parent_task_id IS NULL
      AND t.due_date IS NOT NULL
      AND t.due_date < CURRENT_DATE
      AND (
        t.due_date BETWEEN ${startDate} AND ${endDate}
        OR (t.updated_at::date BETWEEN ${startDate}::date AND ${endDate}::date
            AND (s.name ILIKE '%programad%' OR s.name ILIKE '%aprobad%'
                 OR s.name ILIKE '%publicad%' OR s.name ILIKE '%completad%')
            AND t.updated_at::date > t.due_date)
      )
      AND (
        -- delivered late
        ((s.name ILIKE '%programad%' OR s.name ILIKE '%aprobad%'
          OR s.name ILIKE '%publicad%' OR s.name ILIKE '%completad%')
         AND t.updated_at::date > t.due_date)
        OR
        -- still open past due
        (s.name NOT ILIKE '%programad%' AND s.name NOT ILIKE '%aprobad%'
         AND s.name NOT ILIKE '%publicad%' AND s.name NOT ILIKE '%completad%')
      )
    ORDER BY t.due_date ASC
  `;

  return NextResponse.json({ tasks });
}
