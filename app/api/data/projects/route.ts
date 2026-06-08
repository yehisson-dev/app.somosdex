import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await sql`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.color,
      p.icon,
      p.manager_id,
      p.created_at,
      p.updated_at,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object('id', ps.id, 'name', ps.name, 'color', ps.color, 'position', ps.position)
        ) FILTER (WHERE ps.id IS NOT NULL),
        '[]'
      ) AS statuses,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object('client', jsonb_build_object(
            'id', c.id, 'name', c.name, 'company', c.company, 'color', c.color
          ))
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'
      ) AS clients
    FROM projects p
    LEFT JOIN project_statuses ps ON ps.project_id = p.id
    LEFT JOIN client_projects cp ON cp.project_id = p.id
    LEFT JOIN clients c ON c.id = cp.client_id
    GROUP BY p.id
    ORDER BY p.name
  `;

  return NextResponse.json({ projects });
}
