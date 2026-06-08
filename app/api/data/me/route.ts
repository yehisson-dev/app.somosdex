import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user?.email;
  if (!email) return NextResponse.json({ error: "No email in session" }, { status: 400 });

  const rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return NextResponse.json({ user: rows[0] ?? null });
}
