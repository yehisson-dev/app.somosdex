import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const rows = await sql`SELECT * FROM employee_profiles WHERE user_id = ${userId}`;
  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const body = await req.json();

  const {
    cedula, phone, address, birth_date, start_date, end_date,
    contract_type, salary, salary_currency,
    tss_number, afp_name, afp_account, ars_name, ars_account,
    bank_name, bank_account, bank_account_type, notes,
  } = body;

  await sql`
    INSERT INTO employee_profiles (
      user_id, cedula, phone, address, birth_date, start_date, end_date,
      contract_type, salary, salary_currency,
      tss_number, afp_name, afp_account, ars_name, ars_account,
      bank_name, bank_account, bank_account_type, notes, updated_at
    ) VALUES (
      ${userId}, ${cedula ?? null}, ${phone ?? null}, ${address ?? null},
      ${birth_date ?? null}, ${start_date ?? null}, ${end_date ?? null},
      ${contract_type ?? "tiempo_completo"}, ${salary ?? null}, ${salary_currency ?? "DOP"},
      ${tss_number ?? null}, ${afp_name ?? null}, ${afp_account ?? null},
      ${ars_name ?? null}, ${ars_account ?? null},
      ${bank_name ?? null}, ${bank_account ?? null}, ${bank_account_type ?? "ahorro"},
      ${notes ?? null}, now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      cedula = EXCLUDED.cedula,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address,
      birth_date = EXCLUDED.birth_date,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      contract_type = EXCLUDED.contract_type,
      salary = EXCLUDED.salary,
      salary_currency = EXCLUDED.salary_currency,
      tss_number = EXCLUDED.tss_number,
      afp_name = EXCLUDED.afp_name,
      afp_account = EXCLUDED.afp_account,
      ars_name = EXCLUDED.ars_name,
      ars_account = EXCLUDED.ars_account,
      bank_name = EXCLUDED.bank_name,
      bank_account = EXCLUDED.bank_account,
      bank_account_type = EXCLUDED.bank_account_type,
      notes = EXCLUDED.notes,
      updated_at = now()
  `;

  return NextResponse.json({ ok: true });
}
