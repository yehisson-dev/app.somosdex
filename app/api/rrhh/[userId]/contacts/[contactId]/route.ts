import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string; contactId: string }> }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { contactId } = await params;
  await sql`DELETE FROM emergency_contacts WHERE id = ${contactId}`;
  return NextResponse.json({ ok: true });
}
