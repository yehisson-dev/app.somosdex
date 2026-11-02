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
    SELECT * FROM emergency_contacts WHERE user_id = ${userId} ORDER BY created_at ASC
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
  const { name, relationship, phone, email } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const [row] = await sql`
    INSERT INTO emergency_contacts (user_id, name, relationship, phone, email)
    VALUES (${userId}, ${name.trim()}, ${relationship ?? null}, ${phone ?? null}, ${email ?? null})
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}
