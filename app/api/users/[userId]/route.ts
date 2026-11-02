import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  const { full_name, job_title, avatar_url } = await req.json();

  await sql`
    UPDATE users SET
      full_name  = ${full_name ?? null},
      job_title  = ${job_title ?? null},
      avatar_url = ${avatar_url ?? null},
      updated_at = now()
    WHERE id = ${userId}
  `;

  return NextResponse.json({ ok: true });
}
