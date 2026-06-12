import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import type { ProjectStatus, Task, Client, Project, User } from "@/types/database";

interface PageProps {
  params: Promise<{ projectId: string; clientId: string }>;
}

export default async function ClientKanbanPage({ params }: PageProps) {
  const { projectId, clientId } = await params;
  const session = await auth();

  const [projectRows, clientRows, statuses, tasks, membersRaw, currentUserRows] = await Promise.all([
    sql`SELECT * FROM projects WHERE id = ${projectId} LIMIT 1`,
    sql`SELECT * FROM clients WHERE id = ${clientId} LIMIT 1`,
    sql`SELECT * FROM project_statuses WHERE project_id = ${projectId} ORDER BY position`,
    sql`
      SELECT
        t.*,
        (SELECT json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url)
         FROM users u WHERE u.id = t.assignee_id) AS assignee,
        (SELECT json_build_object('id', ps.id, 'name', ps.name, 'color', ps.color)
         FROM project_statuses ps WHERE ps.id = t.status_id) AS status,
        COALESCE((
          SELECT json_agg(json_build_object('id', td.id, 'file_type', td.file_type, 'thumbnail_url', td.thumbnail_url, 'status', td.status, 'version', td.version))
          FROM task_deliverables td WHERE td.task_id = t.id
        ), '[]') AS deliverables
      FROM tasks t
      WHERE t.project_id = ${projectId} AND t.client_id = ${clientId}
      ORDER BY t.position
    `,
    sql`SELECT id, full_name, avatar_url, job_title FROM users ORDER BY full_name`,
    sql`SELECT id FROM users WHERE email = ${session?.user?.email ?? ""} LIMIT 1`,
  ]);

  if (!projectRows[0] || !clientRows[0]) notFound();

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={(clientRows[0] as any).name}
        subtitle={`${(projectRows[0] as any).name} · ${tasks?.length ?? 0} tareas`}
      />
      <KanbanBoard
        project={projectRows[0] as unknown as Project}
        client={clientRows[0] as unknown as Client}
        statuses={(statuses ?? []) as ProjectStatus[]}
        initialTasks={(tasks ?? []) as unknown as Task[]}
        projectMembers={(membersRaw ?? []) as User[]}
        currentUserId={(currentUserRows[0] as any)?.id ?? ""}
      />
    </div>
  );
}
