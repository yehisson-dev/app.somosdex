import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user?.id;
  if (!userId) return NextResponse.json({ notifications: [] });

  const notifications = await sql`
    SELECT * FROM notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 50
  `;

  return NextResponse.json({ notifications });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user?.id;
  const { id, all } = await req.json();

  if (all) {
    await sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId}`;
  } else if (id) {
    await sql`UPDATE notifications SET is_read = true WHERE id = ${id} AND user_id = ${userId}`;
  }

  return NextResponse.json({ ok: true });
}
