import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const rows = await sql`
    SELECT id, name, company, onboarding_data
    FROM clients
    WHERE onboarding_token = ${token}::uuid
    LIMIT 1
  `.catch(() => []);

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();

  const rows = await sql`
    UPDATE clients
    SET
      onboarding_data = ${sql.json(body)},
      updated_at = now()
    WHERE onboarding_token = ${token}::uuid
    RETURNING id, name
  `.catch(() => []);

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, client: rows[0].name });
}
