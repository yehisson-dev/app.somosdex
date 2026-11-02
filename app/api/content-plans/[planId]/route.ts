import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;
  const body = await req.json();

  await sql`
    UPDATE content_plans SET
      is_published = CASE WHEN ${body.is_published !== undefined} THEN ${body.is_published ?? false} ELSE is_published END,
      title        = CASE WHEN ${body.title !== undefined} THEN ${body.title ?? null} ELSE title END,
      updated_at   = now()
    WHERE id = ${planId}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;
  await sql`DELETE FROM content_plans WHERE id = ${planId}`;
  return NextResponse.json({ ok: true });
}
