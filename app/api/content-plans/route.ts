import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { client_id, platform, title } = await req.json();
  if (!client_id || !platform || !title?.trim())
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  const rows = await sql`
    INSERT INTO content_plans (client_id, platform, title)
    VALUES (${client_id}, ${platform}, ${title.trim()})
    RETURNING *
  `;

  const plan = { ...rows[0], posts: [] };
  return NextResponse.json(plan);
}
