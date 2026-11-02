import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; trainingId: string }> }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { trainingId } = await params;
  const { status } = await req.json();
  const completedAt = status === "completado" ? "now()" : null;

  if (completedAt) {
    await sql`
      UPDATE employee_trainings SET status = ${status}, completed_at = now()
      WHERE id = ${trainingId}
    `;
  } else {
    await sql`
      UPDATE employee_trainings SET status = ${status}, completed_at = NULL
      WHERE id = ${trainingId}
    `;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string; trainingId: string }> }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { trainingId } = await params;
  await sql`DELETE FROM employee_trainings WHERE id = ${trainingId}`;
  return NextResponse.json({ ok: true });
}
