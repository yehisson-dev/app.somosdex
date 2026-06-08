import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("position");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agents: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, system_prompt, name, description } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const supabase = createAdminClient();
  const patch: Record<string, string> = {};
  if (system_prompt !== undefined) patch.system_prompt = system_prompt;
  if (name !== undefined)          patch.name          = name;
  if (description !== undefined)   patch.description   = description;

  const { data, error } = await supabase
    .from("agents")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agent: data });
}
