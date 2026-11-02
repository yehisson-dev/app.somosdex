import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const rows = await sql`
    SELECT et.*, to_char(et.due_date,'YYYY-MM-DD') AS due_date,
      u.full_name AS created_by_name
    FROM employee_trainings et
    LEFT JOIN users u ON u.id = et.created_by
    WHERE et.user_id = ${userId}
    ORDER BY et.created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const currentUserId = (session.user as any).id;
  const { title, description, url, due_date } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const [row] = await sql`
    INSERT INTO employee_trainings (user_id, title, description, url, due_date, created_by)
    VALUES (${userId}, ${title.trim()}, ${description ?? null}, ${url ?? null}, ${due_date ?? null}, ${currentUserId})
    RETURNING *, to_char(due_date,'YYYY-MM-DD') AS due_date
  `;
  return NextResponse.json(row, { status: 201 });
}
