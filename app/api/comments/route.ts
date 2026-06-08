import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const task_id: string = body.task_id;
  // Usar || para descartar string vacío igual que null
  const user_id: string | null = body.user_id || null;
  const content: string = (body.content ?? "").trim();
  const mentions: string[] = Array.isArray(body.mentions) ? body.mentions : [];

  console.log("[comments] task:", task_id, "user:", user_id, "content len:", content.length);

  if (!task_id || !content) {
    return NextResponse.json({ error: "task_id y content son requeridos" }, { status: 400 });
  }

  // Formato literal de array PostgreSQL: '{}' o '{uuid1,uuid2}'
  const pgArray = mentions.length > 0 ? `{${mentions.join(",")}}` : "{}";

  try {
    const rows = await sql`
      INSERT INTO task_comments (task_id, user_id, content, mentions)
      VALUES (
        ${task_id},
        ${user_id},
        ${content},
        ${pgArray}::uuid[]
      )
      RETURNING id, task_id, user_id, content, mentions, created_at, updated_at
    `;

    const comment = rows[0];
    if (!comment) return NextResponse.json({ error: "Insert failed" }, { status: 500 });

    const userRows = user_id
      ? await sql`SELECT id, full_name, avatar_url FROM users WHERE id = ${user_id} LIMIT 1`
      : [];

    console.log("[comments] OK — id:", comment.id);
    return NextResponse.json({ ...comment, user: userRows[0] ?? null });

  } catch (err: any) {
    console.error("[comments] SQL error:", err.message ?? err);
    return NextResponse.json({ error: err.message ?? "DB error" }, { status: 500 });
  }
}
