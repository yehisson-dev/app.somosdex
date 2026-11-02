import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q         = searchParams.get("q")?.trim() ?? "";
  const date      = searchParams.get("date") ?? "";
  const post_type = searchParams.get("post_type") ?? "";
  const client_id = searchParams.get("client_id") ?? "";
  const status    = searchParams.get("status") ?? "";

  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];
  let i = 1;

  if (q) {
    conditions.push(`(cp.caption ILIKE $${i} OR cp.description ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }
  if (date) {
    conditions.push(`cp.publish_date::date = $${i}::date`);
    params.push(date);
    i++;
  }
  if (post_type) {
    conditions.push(`cp.post_type = $${i}`);
    params.push(post_type);
    i++;
  }
  if (client_id) {
    conditions.push(`plan.client_id = $${i}`);
    params.push(client_id);
    i++;
  }
  if (status) {
    conditions.push(`cp.status = $${i}`);
    params.push(status);
    i++;
  }

  const where = conditions.join(" AND ");

  const rows = await sql.unsafe(`
    SELECT
      cp.id,
      cp.caption,
      cp.description,
      cp.publish_date,
      cp.post_type,
      cp.status,
      cp.media_urls,
      cp.assigned_to,
      plan.id AS plan_id,
      plan.platform,
      c.id   AS client_id,
      c.name AS client_name,
      c.color AS client_color
    FROM content_posts cp
    JOIN content_plans plan ON plan.id = cp.plan_id
    JOIN clients c          ON c.id    = plan.client_id
    WHERE ${where}
    ORDER BY cp.publish_date DESC NULLS LAST, c.name ASC
    LIMIT 200
  `, params);

  // Group by client
  const byClient: Record<string, { client_id: string; client_name: string; client_color: string; posts: typeof rows }> = {};
  for (const row of rows) {
    if (!byClient[row.client_id]) {
      byClient[row.client_id] = {
        client_id: row.client_id,
        client_name: row.client_name,
        client_color: row.client_color,
        posts: [],
      };
    }
    byClient[row.client_id].posts.push(row);
  }

  return NextResponse.json({
    total: rows.length,
    brands: Object.values(byClient),
  });
}
