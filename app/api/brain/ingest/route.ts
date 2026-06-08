export const runtime = "nodejs"; // pdf-parse requires Node.js runtime

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { extractFromUrl, extractFromPdf, extractFromText, extractFromAudio } from "@/lib/brain/extractor";
import { chunkText } from "@/lib/brain/chunker";
import { embedBatch } from "@/lib/brain/embedder";

type SourceType = "pdf" | "url" | "text" | "audio";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const brainType  = formData.get("brain_type") as "cubo" | "brand";
  const brandId    = formData.get("brand_id") as string | null;
  const sourceType = formData.get("source_type") as SourceType;
  const title      = formData.get("title") as string;
  const urlValue   = formData.get("url") as string | null;
  const textValue  = formData.get("text") as string | null;
  const file       = formData.get("file") as File | null;

  if (!brainType || !sourceType || !title) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("email", session.user?.email ?? "")
    .single();

  const { data: source, error: sourceErr } = await supabase
    .from("brain_sources")
    .insert({
      brain_type:  brainType,
      brand_id:    brandId || null,
      title:       title.trim(),
      source_type: sourceType,
      source_url:  urlValue || null,
      status:      "processing",
      created_by:  userRow?.id ?? null,
    } as any)
    .select()
    .single();

  if (sourceErr || !source) {
    return NextResponse.json({ error: "Error creando fuente" }, { status: 500 });
  }

  processSource(source.id, sourceType, {
    urlValue, textValue, file, brainType, brandId: brandId || null,
  }).catch(async (err) => {
    console.error("[brain/ingest] Error procesando fuente:", err);
    await supabase
      .from("brain_sources")
      .update({ status: "error", error_msg: String(err) } as any)
      .eq("id", source.id);
  });

  return NextResponse.json({ source_id: source.id, status: "processing" });
}

async function processSource(
  sourceId: string,
  sourceType: SourceType,
  opts: {
    urlValue:  string | null;
    textValue: string | null;
    file:      File | null;
    brainType: "cubo" | "brand";
    brandId:   string | null;
  }
) {
  const supabase = createAdminClient();

  let rawText = "";

  if (sourceType === "url" && opts.urlValue) {
    rawText = await extractFromUrl(opts.urlValue);
  } else if (sourceType === "pdf" && opts.file) {
    const arrayBuffer = await opts.file.arrayBuffer();
    rawText = await extractFromPdf(Buffer.from(arrayBuffer));
  } else if (sourceType === "text" && opts.textValue) {
    rawText = extractFromText(opts.textValue);
  } else if (sourceType === "audio" && opts.file) {
    const arrayBuffer = await opts.file.arrayBuffer();
    rawText = await extractFromAudio(Buffer.from(arrayBuffer), opts.file.name);
  }

  if (!rawText || rawText.length < 50) {
    throw new Error("No se pudo extraer texto suficiente de la fuente.");
  }

  const chunks  = chunkText(rawText);
  const preview = rawText.slice(0, 300);

  const embeddings = await embedBatch(chunks);

  const rows = chunks.map((content, i) => ({
    source_id:   sourceId,
    brain_type:  opts.brainType,
    brand_id:    opts.brandId,
    chunk_index: i,
    content,
    embedding:   `[${embeddings[i].join(",")}]` as any,
  }));

  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase
      .from("brain_embeddings")
      .insert(rows.slice(i, i + 50) as any[]);
    if (error) throw new Error(`Error insertando embeddings: ${error.message}`);
  }

  await supabase
    .from("brain_sources")
    .update({
      status:          "ready",
      chunk_count:     chunks.length,
      content_preview: preview,
    } as any)
    .eq("id", sourceId);
}
