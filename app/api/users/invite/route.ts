import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, name } = await req.json();
  if (!email || !name) return NextResponse.json({ error: "email y name requeridos" }, { status: 400 });

  await sendWelcomeEmail(email, name);
  return NextResponse.json({ ok: true });
}
