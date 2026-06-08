import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: agentId } = await params;
  const clientId = req.nextUrl.searchParams.get("client_id");

  const supabase = createAdminClient();
  let query = supabase
    .from("agent_runs")
    .select("*")
    .eq("agent_id", agentId)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(10);

  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: data ?? [] });
}
