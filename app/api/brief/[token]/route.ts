import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

// GET — obtener datos del brief actual (sin auth, solo con token)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const rows = await sql`
    SELECT id, name, company, brief_data
    FROM clients
    WHERE brief_token = ${token}::uuid
    LIMIT 1
  `.catch(() => []);

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

// POST — guardar respuestas del brief
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();

  const rows = await sql`
    UPDATE clients
    SET
      brief_data = ${JSON.stringify(body)}::jsonb,
      updated_at = now()
    WHERE brief_token = ${token}::uuid
    RETURNING id, name
  `.catch(() => []);

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, client: rows[0].name });
}
