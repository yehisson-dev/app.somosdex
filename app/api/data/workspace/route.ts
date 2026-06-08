import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`SELECT * FROM workspace_settings LIMIT 1`;
  return NextResponse.json({ workspace: rows[0] ?? null });
}
