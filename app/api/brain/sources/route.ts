import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const brainType = searchParams.get("brain_type") as "cubo" | "brand" | null;
  const brandId   = searchParams.get("brand_id");

  const supabase = createAdminClient();

  let query = supabase
    .from("brain_sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (brainType) query = query.eq("brain_type", brainType);
  if (brandId)   query = query.eq("brand_id", brandId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data ?? [] });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const supabase = createAdminClient();

  // Delete embeddings first (FK constraint)
  await supabase.from("brain_embeddings").delete().eq("source_id", id);

  const { error } = await supabase.from("brain_sources").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
