import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await sql`SELECT * FROM companies ORDER BY name`;
  return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, name, rnc, phone, address, email, logo_url } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const rows = await sql`
    INSERT INTO companies (id, name, rnc, phone, address, email, logo_url)
    VALUES (${id}, ${name ?? null}, ${rnc ?? null}, ${phone ?? null}, ${address ?? null}, ${email ?? null}, ${logo_url ?? null})
    ON CONFLICT (id) DO UPDATE SET
      name     = EXCLUDED.name,
      rnc      = EXCLUDED.rnc,
      phone    = EXCLUDED.phone,
      address  = EXCLUDED.address,
      email    = EXCLUDED.email,
      logo_url = EXCLUDED.logo_url
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}
