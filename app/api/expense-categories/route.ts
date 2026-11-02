import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cats = await sql`SELECT * FROM expense_categories ORDER BY name`;
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const [cat] = await sql`
    INSERT INTO expense_categories (name, color)
    VALUES (${name.trim()}, ${color ?? "#6b7280"})
    RETURNING *
  `;
  return NextResponse.json(cat, { status: 201 });
}
