import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ tasks: [], clients: [], projects: [], users: [] });

  const like = `%${q}%`;

  const [tasks, clients, projects, users] = await Promise.all([
    sql`
      SELECT t.id, t.title, t.priority,
        ps.name  AS status_name,  ps.color AS status_color,
        p.name   AS project_name, p.color  AS project_color,
        c.name   AS client_name,
        u.full_name AS assignee_name, u.avatar_url AS assignee_avatar
      FROM tasks t
      LEFT JOIN project_statuses ps ON ps.id = t.status_id
      LEFT JOIN projects p          ON p.id  = t.project_id
      LEFT JOIN clients c           ON c.id  = t.client_id
      LEFT JOIN users u             ON u.id  = t.assignee_id
      WHERE t.parent_task_id IS NULL
        AND (t.title ILIKE ${like} OR t.description ILIKE ${like})
      ORDER BY t.updated_at DESC
      LIMIT 8
    `,
    sql`
      SELECT id, name, company, color,
        (SELECT COUNT(*) FROM tasks WHERE client_id = clients.id AND parent_task_id IS NULL) AS task_count
      FROM clients
      WHERE name ILIKE ${like} OR company ILIKE ${like}
      ORDER BY name ASC
      LIMIT 6
    `,
    sql`
      SELECT id, name, color, slug,
        (SELECT COUNT(*) FROM tasks WHERE project_id = projects.id AND parent_task_id IS NULL) AS task_count
      FROM projects
      WHERE name ILIKE ${like}
      ORDER BY name ASC
      LIMIT 5
    `,
    sql`
      SELECT id, full_name, job_title, avatar_url, email
      FROM users
      WHERE full_name ILIKE ${like} OR email ILIKE ${like}
      ORDER BY full_name ASC
      LIMIT 5
    `,
  ]);

  return NextResponse.json({ tasks, clients, projects, users });
}
