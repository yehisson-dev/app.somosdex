import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

// GET: devuelve el calendar_token del usuario actual
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`
    SELECT calendar_token FROM users WHERE id = ${session.user.id} LIMIT 1
  `;
  const token = (rows[0] as any)?.calendar_token ?? null;
  return NextResponse.json({ token });
}

// POST: regenera el token (invalida el anterior)
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`
    UPDATE users SET calendar_token = gen_random_uuid()
    WHERE id = ${session.user.id}
    RETURNING calendar_token
  `;
  const token = (rows[0] as any)?.calendar_token;
  return NextResponse.json({ token });
}
