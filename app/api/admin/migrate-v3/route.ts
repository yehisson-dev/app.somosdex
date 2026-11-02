import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function POST() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS employee_profiles (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        cedula TEXT,
        phone TEXT,
        address TEXT,
        birth_date DATE,
        start_date DATE,
        end_date DATE,
        contract_type TEXT DEFAULT 'tiempo_completo',
        salary NUMERIC(12,2),
        salary_currency TEXT DEFAULT 'DOP',
        tss_number TEXT,
        afp_name TEXT,
        afp_account TEXT,
        ars_name TEXT,
        ars_account TEXT,
        bank_name TEXT,
        bank_account TEXT,
        bank_account_type TEXT DEFAULT 'ahorro',
        notes TEXT,
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        relationship TEXT,
        phone TEXT,
        email TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS employee_trainings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        url TEXT,
        due_date DATE,
        status TEXT DEFAULT 'pendiente',
        completed_at TIMESTAMPTZ,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    return NextResponse.json({ ok: true, message: "Migration v3 completed — RRHH tables created" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
