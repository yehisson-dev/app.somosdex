import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`SELECT * FROM workspace_settings LIMIT 1`;
  return NextResponse.json(rows[0] ?? null);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    platform_name, company_name, company_email,
    company_phone, company_website, company_address, logo_url,
  } = body;

  const existing = await sql`SELECT id FROM workspace_settings LIMIT 1`;

  let result;
  if (existing[0]) {
    result = await sql`
      UPDATE workspace_settings SET
        platform_name   = ${platform_name ?? null},
        company_name    = ${company_name ?? null},
        company_email   = ${company_email ?? null},
        company_phone   = ${company_phone ?? null},
        company_website = ${company_website ?? null},
        company_address = ${company_address ?? null},
        logo_url        = ${logo_url ?? null},
        updated_at      = now()
      WHERE id = ${existing[0].id}
      RETURNING *
    `;
  } else {
    result = await sql`
      INSERT INTO workspace_settings
        (platform_name, company_name, company_email, company_phone, company_website, company_address, logo_url)
      VALUES
        (${platform_name ?? null}, ${company_name ?? null}, ${company_email ?? null},
         ${company_phone ?? null}, ${company_website ?? null}, ${company_address ?? null}, ${logo_url ?? null})
      RETURNING *
    `;
  }

  return NextResponse.json(result[0]);
}
