import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  const rows = await sql`
    SELECT
      t.id, t.title, t.description, t.content, t.content_type,
      t.client_id, t.project_id, t.status_id, t.assignee_id, t.approver_id,
      t.priority, t.position, t.created_by, t.created_at, t.updated_at,
      t.estimated_hours, t.price, t.scheduled_at,
      to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
      to_char(t.scheduled_date, 'YYYY-MM-DD') AS scheduled_date,
      CASE WHEN c.id IS NOT NULL THEN json_build_object('id',c.id,'name',c.name,'company',c.company,'color',c.color) END AS client,
      CASE WHEN p.id IS NOT NULL THEN json_build_object('id',p.id,'name',p.name,'color',p.color,'slug',p.slug) END AS project,
      CASE WHEN ps.id IS NOT NULL THEN json_build_object('id',ps.id,'name',ps.name,'color',ps.color,'position',ps.position) END AS status,
      CASE WHEN ua.id IS NOT NULL THEN json_build_object('id',ua.id,'full_name',ua.full_name,'avatar_url',ua.avatar_url,'job_title',ua.job_title) END AS assignee,
      CASE WHEN uap.id IS NOT NULL THEN json_build_object('id',uap.id,'full_name',uap.full_name,'avatar_url',uap.avatar_url,'job_title',uap.job_title) END AS approver,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id',td.id,'file_name',td.file_name,'file_url',td.file_url,
          'file_type',td.file_type,'thumbnail_url',td.thumbnail_url,
          'status',td.status,'version',td.version,'review_note',td.review_note,
          'created_at',td.created_at,'uploaded_by',td.uploaded_by,
          'uploader', CASE WHEN tu.id IS NOT NULL THEN json_build_object('id',tu.id,'full_name',tu.full_name,'avatar_url',tu.avatar_url) END
        ) ORDER BY td.created_at DESC)
        FROM task_deliverables td
        LEFT JOIN users tu ON tu.id = td.uploaded_by
        WHERE td.task_id = t.id
      ), '[]') AS deliverables,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id',tc.id,'content',tc.content,'created_at',tc.created_at,'user_id',tc.user_id,
          'user', CASE WHEN tcu.id IS NOT NULL THEN json_build_object('id',tcu.id,'full_name',tcu.full_name,'avatar_url',tcu.avatar_url) END
        ) ORDER BY tc.created_at ASC)
        FROM task_comments tc
        LEFT JOIN users tcu ON tcu.id = tc.user_id
        WHERE tc.task_id = t.id
      ), '[]') AS comments,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id',ta.id,'action',ta.action,'metadata',ta.metadata,'created_at',ta.created_at,
          'user', CASE WHEN tau.id IS NOT NULL THEN json_build_object('id',tau.id,'full_name',tau.full_name,'avatar_url',tau.avatar_url) END
        ) ORDER BY ta.created_at DESC)
        FROM task_activity ta
        LEFT JOIN users tau ON tau.id = ta.user_id
        WHERE ta.task_id = t.id
      ), '[]') AS activity
    FROM tasks t
    LEFT JOIN clients c ON c.id = t.client_id
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN project_statuses ps ON ps.id = t.status_id
    LEFT JOIN users ua ON ua.id = t.assignee_id
    LEFT JOIN users uap ON uap.id = t.approver_id
    WHERE t.id = ${taskId}
    LIMIT 1
  `;

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
