import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

// POST /api/kpis/social — upsert social metrics for a user/month
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    user_id, month, year,
    avg_retention_3s, videos_with_brand_id, total_videos,
    avg_saves, avg_comments, authority_pieces, total_pieces,
    escalations_to_director, notes,
  } = body;

  if (!user_id || !month || !year)
    return NextResponse.json({ error: "user_id, month y year son requeridos" }, { status: 400 });

  const rows = await sql`
    INSERT INTO kpi_social_metrics (
      user_id, month, year,
      avg_retention_3s, videos_with_brand_id, total_videos,
      avg_saves, avg_comments, authority_pieces, total_pieces,
      escalations_to_director, notes, updated_at
    ) VALUES (
      ${user_id}, ${month}, ${year},
      ${avg_retention_3s ?? null}, ${videos_with_brand_id ?? null}, ${total_videos ?? null},
      ${avg_saves ?? null}, ${avg_comments ?? null}, ${authority_pieces ?? null}, ${total_pieces ?? null},
      ${escalations_to_director ?? null}, ${notes ?? null}, now()
    )
    ON CONFLICT (user_id, month, year) DO UPDATE SET
      avg_retention_3s        = EXCLUDED.avg_retention_3s,
      videos_with_brand_id    = EXCLUDED.videos_with_brand_id,
      total_videos            = EXCLUDED.total_videos,
      avg_saves               = EXCLUDED.avg_saves,
      avg_comments            = EXCLUDED.avg_comments,
      authority_pieces        = EXCLUDED.authority_pieces,
      total_pieces            = EXCLUDED.total_pieces,
      escalations_to_director = EXCLUDED.escalations_to_director,
      notes                   = EXCLUDED.notes,
      updated_at              = now()
    RETURNING *
  `;

  return NextResponse.json(rows[0]);
}
