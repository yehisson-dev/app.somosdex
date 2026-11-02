import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;

  const rows = await sql`
    SELECT content_approval_token AS token FROM clients WHERE id = ${clientId} LIMIT 1
  `;
  const token = (rows[0] as any)?.token ?? null;
  return NextResponse.json({ token });
}
