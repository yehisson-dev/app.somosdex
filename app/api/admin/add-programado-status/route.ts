import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/admin/add-programado-status
// Adds "Programado" status (after Aprobado) to every project that lacks it.
export async function POST() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Find projects that have "Aprobado" but no "Programado"
  const projects = await sql`
    SELECT p.id, p.name,
      (SELECT ps.position FROM project_statuses ps
       WHERE ps.project_id = p.id AND ps.name ILIKE '%aprobad%'
       ORDER BY ps.position DESC LIMIT 1) AS aprobado_position
    FROM projects p
    WHERE EXISTS (
      SELECT 1 FROM project_statuses ps
      WHERE ps.project_id = p.id AND ps.name ILIKE '%aprobad%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM project_statuses ps
      WHERE ps.project_id = p.id AND ps.name ILIKE '%programad%'
    )
  `;

  const added: string[] = [];

  for (const project of projects as any[]) {
    const position = (project.aprobado_position ?? 3) + 1;
    await sql`
      INSERT INTO project_statuses (project_id, name, color, position)
      VALUES (${project.id}, 'Programado', '#3b82f6', ${position})
    `;
    added.push(`${project.name} (position ${position})`);
  }

  return NextResponse.json({
    ok: true,
    added: added.length,
    projects: added,
  });
}
