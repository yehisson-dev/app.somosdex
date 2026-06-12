import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

interface Params { params: Promise<{ projectId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await params;
  const { userId } = await req.json();

  await sql`
    INSERT INTO project_members (project_id, user_id)
    VALUES (${projectId}, ${userId})
    ON CONFLICT DO NOTHING
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await params;
  const { userId } = await req.json();

  await sql`DELETE FROM project_members WHERE project_id = ${projectId} AND user_id = ${userId}`;
  return NextResponse.json({ ok: true });
}
