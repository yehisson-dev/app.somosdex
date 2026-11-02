import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/kpis?month=7&year=2026
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const year  = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()));

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate   = new Date(year, month, 0).toISOString().slice(0, 10);

  // Collaborators with KPI roles
  const users = await sql`
    SELECT id, full_name, email, job_title, avatar_url
    FROM users
    WHERE job_title IN ('Editor Videos','Diseñadora','Diseñador','Content Creator','Coordinadora','Project Manager')
       OR role = 'project_manager'
    ORDER BY
      CASE job_title
        WHEN 'Coordinadora'    THEN 1
        WHEN 'Project Manager' THEN 1
        WHEN 'Content Creator' THEN 2
        WHEN 'Diseñadora'      THEN 3
        WHEN 'Diseñador'       THEN 3
        WHEN 'Editor Videos'   THEN 4
        ELSE 5
      END, full_name
  `;

  // "Done" = status name matches these words
  // "On time" = task was done AND due_date >= updated_at::date (completed before/on deadline)
  // "Late"    = task was done AND due_date <  updated_at::date
  //           OR task is NOT done AND due_date < today
  const taskStats = await sql`
    SELECT
      t.assignee_id,
      COUNT(*)                                    AS total_tasks,

      -- Delivered = status indicates completion
      COUNT(*) FILTER (WHERE
        s.name ILIKE '%programad%'
        OR s.name ILIKE '%aprobad%'
        OR s.name ILIKE '%publicad%'
        OR s.name ILIKE '%completad%'
      )                                           AS delivered,

      -- On time = delivered AND completed on or before due date
      COUNT(*) FILTER (WHERE
        (s.name ILIKE '%programad%' OR s.name ILIKE '%aprobad%'
         OR s.name ILIKE '%publicad%' OR s.name ILIKE '%completad%')
        AND t.due_date IS NOT NULL
        AND t.updated_at::date <= t.due_date
      )                                           AS on_time,

      -- Late = delivered after due date OR still open past due date
      COUNT(*) FILTER (WHERE
        t.due_date IS NOT NULL
        AND t.due_date < CURRENT_DATE
        AND (
          -- delivered late
          ((s.name ILIKE '%programad%' OR s.name ILIKE '%aprobad%'
            OR s.name ILIKE '%publicad%' OR s.name ILIKE '%completad%')
           AND t.updated_at::date > t.due_date)
          OR
          -- still open and past due
          (s.name NOT ILIKE '%programad%' AND s.name NOT ILIKE '%aprobad%'
           AND s.name NOT ILIKE '%publicad%' AND s.name NOT ILIKE '%completad%')
        )
      )                                           AS late,

      ROUND(AVG(t.revision_rounds) FILTER (WHERE t.revision_rounds IS NOT NULL AND t.revision_rounds > 0), 1) AS avg_revisions,
      COUNT(*) FILTER (WHERE t.revision_rounds > 2)            AS over_revision_limit,
      COUNT(*) FILTER (WHERE t.brief_required_revision = true) AS brief_reprocesos,
      COUNT(*) FILTER (WHERE t.task_type = 'pieza_grafica')    AS piezas_graficas,
      COUNT(*) FILTER (WHERE t.task_type = 'video')            AS videos,
      COUNT(*) FILTER (WHERE t.task_type = 'calendario')       AS calendarios,
      COUNT(*) FILTER (WHERE t.task_type = 'reporte')          AS reportes,
      COUNT(*) FILTER (WHERE t.brand_approved = true)          AS brand_approved,
      COUNT(*) FILTER (WHERE t.brand_approved = false)         AS brand_rejected
    FROM tasks t
    LEFT JOIN project_statuses s ON s.id = t.status_id
    WHERE t.assignee_id IS NOT NULL
      AND t.parent_task_id IS NULL
      AND (
        -- Include tasks due this month OR tasks updated (completed) this month
        t.due_date BETWEEN ${startDate} AND ${endDate}
        OR (t.updated_at::date BETWEEN ${startDate}::date AND ${endDate}::date
            AND (s.name ILIKE '%programad%' OR s.name ILIKE '%aprobad%'
                 OR s.name ILIKE '%publicad%' OR s.name ILIKE '%completad%'))
      )
    GROUP BY t.assignee_id
  `;

  // Social metrics
  const social = await sql`
    SELECT * FROM kpi_social_metrics
    WHERE month = ${month} AND year = ${year}
  `;

  // Combine
  const result = (users as any[]).map(u => {
    const stats   = (taskStats as any[]).find(s => s.assignee_id === u.id) ?? {};
    const soc     = (social as any[]).find(s => s.user_id === u.id) ?? {};
    const total   = Number(stats.total_tasks ?? 0);
    const delivered = Number(stats.delivered ?? 0);
    const onTime  = Number(stats.on_time ?? 0);
    return {
      ...u,
      tasks: {
        total,
        delivered,
        on_time:             onTime,
        late:                Number(stats.late ?? 0),
        pct_on_time:         delivered > 0 ? Math.round((onTime / delivered) * 100) : null,
        avg_revisions:       stats.avg_revisions ? Number(stats.avg_revisions) : null,
        over_revision_limit: Number(stats.over_revision_limit ?? 0),
        brief_reprocesos:    Number(stats.brief_reprocesos ?? 0),
        piezas_graficas:     Number(stats.piezas_graficas ?? 0),
        videos:              Number(stats.videos ?? 0),
        calendarios:         Number(stats.calendarios ?? 0),
        reportes:            Number(stats.reportes ?? 0),
        brand_approved:      Number(stats.brand_approved ?? 0),
        brand_rejected:      Number(stats.brand_rejected ?? 0),
      },
      social: {
        avg_retention_3s:        soc.avg_retention_3s ? Number(soc.avg_retention_3s) : null,
        videos_with_brand_id:    soc.videos_with_brand_id ?? null,
        total_videos:            soc.total_videos ?? null,
        avg_saves:               soc.avg_saves ? Number(soc.avg_saves) : null,
        avg_comments:            soc.avg_comments ? Number(soc.avg_comments) : null,
        authority_pieces:        soc.authority_pieces ?? null,
        total_pieces:            soc.total_pieces ?? null,
        escalations_to_director: soc.escalations_to_director ?? null,
        notes:                   soc.notes ?? null,
        id:                      soc.id ?? null,
      },
    };
  });

  return NextResponse.json({ users: result, month, year });
}
