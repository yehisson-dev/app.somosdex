import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

function adminOnly(session: any) {
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

// GET — listar todos los prospectos con usuario asignado
export async function GET() {
  const session = await auth();
  const err = adminOnly(session);
  if (err) return err;

  const rows = await sql`
    SELECT
      p.*,
      to_char(p.expected_close, 'YYYY-MM-DD') AS expected_close,
      json_build_object(
        'id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url
      ) AS assigned_user
    FROM prospects p
    LEFT JOIN users u ON u.id = p.assigned_to
    ORDER BY p.created_at DESC
  `.catch(() => []);

  return NextResponse.json({ data: rows });
}

// POST — crear prospecto
export async function POST(req: NextRequest) {
  const session = await auth();
  const err = adminOnly(session);
  if (err) return err;

  const body = await req.json();
  const { name, company, email, phone, stage, value, currency, notes, source, assigned_to, expected_close } = body;

  if (!name) return NextResponse.json({ error: "name requerido" }, { status: 400 });

  const rows = await sql`
    INSERT INTO prospects (name, company, email, phone, stage, value, currency, notes, source, assigned_to, expected_close)
    VALUES (
      ${name}, ${company ?? null}, ${email ?? null}, ${phone ?? null},
      ${stage ?? "contacto"}, ${value ?? 0}, ${currency ?? "USD"},
      ${notes ?? null}, ${source ?? null},
      ${assigned_to ?? null},
      ${expected_close ?? null}
    )
    RETURNING *, to_char(expected_close, 'YYYY-MM-DD') AS expected_close
  `;

  return NextResponse.json({ data: rows[0] }, { status: 201 });
}
