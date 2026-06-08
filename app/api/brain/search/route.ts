import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchBrain, buildContext } from "@/lib/brain/search";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    query,
    brand_id = null,
    mode = "both",
    limit = 8,
    return_context = false,
  } = body as {
    query: string;
    brand_id?: string | null;
    mode?: "both" | "cubo" | "brand";
    limit?: number;
    return_context?: boolean;
  };

  if (!query || query.trim().length < 3) {
    return NextResponse.json({ error: "Query demasiado corta" }, { status: 400 });
  }

  const chunks = await searchBrain(query.trim(), brand_id, mode, limit);
  const context = return_context ? buildContext(chunks) : undefined;

  return NextResponse.json({ chunks, context, total: chunks.length });
}
