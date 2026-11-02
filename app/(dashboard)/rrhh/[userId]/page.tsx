import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { FichaClient } from "@/components/rrhh/FichaClient";

export const dynamic = "force-dynamic";

export default async function FichaPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/proyectos");

  const { userId } = await params;

  const [users, profiles, contacts, trainings, tasks] = await Promise.all([
    sql`SELECT id, full_name, email, role, job_title, avatar_url, created_at FROM users WHERE id = ${userId}`,
    sql`SELECT *, to_char(birth_date, 'YYYY-MM-DD') AS birth_date FROM employee_profiles WHERE user_id = ${userId}`.catch(() => []),
    sql`SELECT * FROM emergency_contacts WHERE user_id = ${userId} ORDER BY created_at ASC`.catch(() => []),
    sql`
      SELECT et.*, to_char(et.due_date,'YYYY-MM-DD') AS due_date, u.full_name AS created_by_name
      FROM employee_trainings et LEFT JOIN users u ON u.id = et.created_by
      WHERE et.user_id = ${userId} ORDER BY et.created_at DESC
    `.catch(() => []),
    sql`
      SELECT
        t.id, t.title, t.priority,
        to_char(t.due_date,'YYYY-MM-DD') AS due_date,
        t.created_at,
        json_build_object('id',ps.id,'name',ps.name,'color',ps.color) AS status,
        json_build_object('id',p.id,'name',p.name,'color',p.color) AS project,
        json_build_object('id',c.id,'name',c.name,'color',c.color) AS client
      FROM tasks t
      LEFT JOIN project_statuses ps ON ps.id = t.status_id
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE t.assignee_id = ${userId} AND t.parent_task_id IS NULL
      ORDER BY t.due_date ASC NULLS LAST
      LIMIT 100
    `.catch(() => []),
  ]);

  if (!users[0]) notFound();

  const user = users[0] as any;
  const profile = (profiles as any[])[0] ?? null;

  // Métricas de tareas
  const taskList = tasks as any[];
  const completedCount = taskList.filter(
    (t) => t.status?.name?.toLowerCase().match(/completad|done|listo|terminad/)
  ).length;
  const overdueCount = taskList.filter(
    (t) =>
      t.due_date &&
      t.due_date < new Date().toISOString().split("T")[0] &&
      !t.status?.name?.toLowerCase().match(/completad|done|listo|terminad/)
  ).length;
  const inProgressCount = taskList.filter(
    (t) =>
      t.status?.name?.toLowerCase().match(/progreso|proceso|en curso|working/)
  ).length;

  const metrics = {
    total: taskList.length,
    completed: completedCount,
    overdue: overdueCount,
    inProgress: inProgressCount,
    completionRate: taskList.length > 0 ? Math.round((completedCount / taskList.length) * 100) : 0,
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={user.full_name ?? user.email}
        subtitle={user.job_title ?? "Colaborador"}
        backHref="/rrhh"
      />
      <FichaClient
        user={user}
        profile={profile}
        contacts={contacts as any[]}
        trainings={trainings as any[]}
        tasks={taskList}
        metrics={metrics}
      />
    </div>
  );
}
