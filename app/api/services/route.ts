import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await sql`SELECT * FROM services ORDER BY name`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, description, unit_price, unit } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name requerido" }, { status: 400 });

  const rows = await sql`
    INSERT INTO services (name, description, unit_price, unit)
    VALUES (${name.trim()}, ${description ?? null}, ${unit_price ?? 0}, ${unit ?? "servicio"})
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}
