import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { OWNER_EMAIL } from "@/lib/mi-semana-utils";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.email !== OWNER_EMAIL) return forbidden();
  const uid = session.user.id as string;
  const { bloque_id, titulo, orden } = await req.json();
  const [row] = await sql`
    INSERT INTO ms_actividades (bloque_id, usuario_id, titulo, orden)
    VALUES (${bloque_id}, ${uid}, ${titulo}, ${orden ?? 0})
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}
