import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { RRHHListClient } from "@/components/rrhh/RRHHListClient";

export const dynamic = "force-dynamic";

export default async function RRHHPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/proyectos");

  const [users, profiles, taskStats, projects, memberships, clientProjects, memberClients] = await Promise.all([
    sql`SELECT id, full_name, email, role, job_title, avatar_url, created_at FROM users ORDER BY full_name ASC`,
    sql`SELECT * FROM employee_profiles`.catch(() => []),
    sql`
      SELECT
        t.assignee_id,
        COUNT(*) FILTER (WHERE ps.name ILIKE '%completad%' OR ps.name ILIKE '%done%' OR ps.name ILIKE '%listo%') AS completed,
        COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE AND (ps.name NOT ILIKE '%completad%' AND ps.name NOT ILIKE '%done%' AND ps.name NOT ILIKE '%listo%')) AS overdue,
        COUNT(*) AS total
      FROM tasks t
      LEFT JOIN project_statuses ps ON ps.id = t.status_id
      WHERE t.assignee_id IS NOT NULL AND t.parent_task_id IS NULL
      GROUP BY t.assignee_id
    `.catch(() => []),
    sql`SELECT id, name, color, slug FROM projects ORDER BY name`,
    sql`SELECT project_id, user_id FROM project_members`,
    sql`SELECT cp.project_id, cp.client_id, c.name, c.color FROM client_projects cp JOIN clients c ON c.id = cp.client_id`.catch(() => []),
    sql`SELECT project_id, user_id, client_id FROM member_clients`.catch(() => []),
  ]);

  const profilesMap = Object.fromEntries((profiles as any[]).map((p) => [p.user_id, p]));
  const statsMap = Object.fromEntries((taskStats as any[]).map((s) => [s.assignee_id, s]));

  const clientsByProject: Record<string, any[]> = {};
  for (const row of clientProjects as any[]) {
    if (!clientsByProject[row.project_id]) clientsByProject[row.project_id] = [];
    clientsByProject[row.project_id].push({ id: row.client_id, name: row.name, color: row.color });
  }

  const enrichedUsers = (users as any[]).map((u) => ({
    ...u,
    profile: profilesMap[u.id] ?? null,
    stats: statsMap[u.id] ?? { completed: 0, overdue: 0, total: 0 },
  }));

  return (
    <div className="flex flex-col h-full">
      <TopBar title="RRHH" subtitle="Equipo y colaboradores" />
      <RRHHListClient
        users={enrichedUsers}
        projects={projects as any[]}
        memberships={memberships as any[]}
        clientsByProject={clientsByProject}
        memberClients={memberClients as any[]}
      />
    </div>
  );
}
