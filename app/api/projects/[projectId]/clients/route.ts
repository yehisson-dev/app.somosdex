import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

interface Params { params: Promise<{ projectId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await params;
  const { clientId } = await req.json();

  await sql`
    INSERT INTO client_projects (project_id, client_id)
    VALUES (${projectId}, ${clientId})
    ON CONFLICT DO NOTHING
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await params;
  const { clientId } = await req.json();

  await sql`DELETE FROM client_projects WHERE project_id = ${projectId} AND client_id = ${clientId}`;
  return NextResponse.json({ ok: true });
}
