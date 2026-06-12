import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rate } = await req.json();
  const n = Number(rate);
  if (!n || n <= 0) return NextResponse.json({ error: "Tasa inválida" }, { status: 400 });

  await sql`UPDATE workspace_settings SET usd_to_dop_rate = ${n}, updated_at = now()`;
  return NextResponse.json({ ok: true, rate: n });
}
