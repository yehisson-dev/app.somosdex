import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { TaskDetailClient } from "@/components/tasks/TaskDetailClient";
import type { Task, ProjectStatus, User } from "@/types/database";

interface PageProps {
  params: Promise<{ taskId: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { taskId } = await params;
  const session = await auth();

  // Fetch task with all relations
  const taskRows = await sql`
    SELECT
      t.*,
      json_build_object('id', c.id, 'name', c.name, 'company', c.company, 'color', c.color) AS client,
      json_build_object('id', p.id, 'name', p.name, 'color', p.color, 'slug', p.slug) AS project,
      json_build_object('id', ps.id, 'name', ps.name, 'color', ps.color, 'position', ps.position) AS status,
      (SELECT json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url, 'job_title', u.job_title)
       FROM users u WHERE u.id = t.assignee_id) AS assignee,
      (SELECT json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url, 'job_title', u.job_title)
       FROM users u WHERE u.id = t.approver_id) AS approver,
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', td.id, 'task_id', td.task_id, 'uploaded_by', td.uploaded_by,
            'version', td.version, 'file_name', td.file_name, 'file_url', td.file_url,
            'file_type', td.file_type, 'thumbnail_url', td.thumbnail_url,
            'status', td.status, 'review_note', td.review_note,
            'reviewed_by', td.reviewed_by, 'reviewed_at', td.reviewed_at,
            'created_at', td.created_at,
            'uploader', (SELECT json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url)
                         FROM users u WHERE u.id = td.uploaded_by)
          ) ORDER BY td.version
        ) FROM task_deliverables td WHERE td.task_id = t.id
      ), '[]') AS deliverables,
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', tc.id, 'task_id', tc.task_id, 'user_id', tc.user_id,
            'content', tc.content, 'mentions', tc.mentions,
            'created_at', tc.created_at, 'updated_at', tc.updated_at,
            'user', (SELECT json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url)
                     FROM users u WHERE u.id = tc.user_id)
          ) ORDER BY tc.created_at
        ) FROM task_comments tc WHERE tc.task_id = t.id
      ), '[]') AS comments,
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', ta.id, 'task_id', ta.task_id, 'user_id', ta.user_id,
            'action', ta.action, 'metadata', ta.metadata, 'created_at', ta.created_at,
            'user', (SELECT json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url)
                     FROM users u WHERE u.id = ta.user_id)
          ) ORDER BY ta.created_at DESC
        ) FROM task_activity ta WHERE ta.task_id = t.id
      ), '[]') AS activity
    FROM tasks t
    LEFT JOIN clients c ON c.id = t.client_id
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN project_statuses ps ON ps.id = t.status_id
    WHERE t.id = ${taskId}
    LIMIT 1
  `;

  if (!taskRows[0]) notFound();
  const task = taskRows[0] as any;

  const statuses = await sql`
    SELECT * FROM project_statuses WHERE project_id = ${task.project_id} ORDER BY position
  `;

  const membersRaw = await sql`SELECT id, full_name, avatar_url, job_title FROM users ORDER BY full_name`;

  return (
    <TaskDetailClient
      task={task as Task}
      statuses={(statuses ?? []) as ProjectStatus[]}
      projectMembers={(membersRaw ?? []) as User[]}
      currentUserId={session?.user?.id ?? ""}
    />
  );
}
