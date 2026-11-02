import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

function pgTextArray(arr: string[]): string {
  if (!arr.length) return "{}";
  return "{" + arr.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",") + "}";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;
  const { media_urls, publish_date, post_type, caption, description, position } = await req.json();

  const urlsLiteral = pgTextArray(media_urls ?? []);

  const rows = await sql`
    INSERT INTO content_posts (plan_id, media_urls, publish_date, post_type, caption, description, position)
    VALUES (
      ${planId},
      ${urlsLiteral}::text[],
      ${publish_date ?? null},
      ${post_type ?? null},
      ${caption ?? null},
      ${description ?? null},
      ${position ?? 0}
    )
    RETURNING *
  `;

  return NextResponse.json({ ...rows[0], comments: [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;
  const { postId, media_urls, publish_date, post_type, caption, description, position } = await req.json();
  if (!postId) return NextResponse.json({ error: "postId requerido" }, { status: 400 });

  const urlsLiteral = media_urls !== undefined ? pgTextArray(media_urls ?? []) : null;

  await sql`
    UPDATE content_posts SET
      media_urls   = CASE WHEN ${urlsLiteral !== null} THEN ${urlsLiteral ?? "{}"}::text[] ELSE media_urls END,
      publish_date = CASE WHEN ${publish_date !== undefined} THEN ${publish_date ?? null} ELSE publish_date END,
      post_type    = CASE WHEN ${post_type !== undefined} THEN ${post_type ?? null} ELSE post_type END,
      caption      = CASE WHEN ${caption !== undefined} THEN ${caption ?? null} ELSE caption END,
      description  = CASE WHEN ${description !== undefined} THEN ${description ?? null} ELSE description END,
      position     = CASE WHEN ${position !== undefined} THEN ${position ?? 0} ELSE position END,
      updated_at   = now()
    WHERE id = ${postId} AND plan_id = ${planId}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;
  const { postId } = await req.json();
  if (!postId) return NextResponse.json({ error: "postId requerido" }, { status: 400 });

  await sql`DELETE FROM content_posts WHERE id = ${postId} AND plan_id = ${planId}`;
  return NextResponse.json({ ok: true });
}
