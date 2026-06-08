import sql from "@/lib/db";
import { embedText } from "./embedder";

export interface BrainChunk {
  source_id:    string;
  source_title: string;
  brain_type:   string;
  chunk_index:  number;
  content:      string;
  similarity:   number;
}

/**
 * Cosine similarity between two float arrays.
 */
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search the knowledge base using semantic similarity.
 * Embeddings are stored as JSON text arrays in brain_embeddings.embedding.
 */
export async function searchBrain(
  query:   string,
  brandId: string | null = null,
  mode:    "both" | "cubo" | "brand" = "both",
  limit    = 8,
): Promise<BrainChunk[]> {
  const queryEmbedding = await embedText(query);

  // Build filter condition
  let filter = `bs.status = 'ready'`;
  if (mode === "cubo") {
    filter += ` AND be.brain_type = 'cubo'`;
  } else if (mode === "brand") {
    filter += ` AND be.brain_type = 'brand'`;
    if (brandId) filter += ` AND be.brand_id = '${brandId}'`;
  } else {
    // both
    if (brandId) {
      filter += ` AND (be.brain_type = 'cubo' OR (be.brain_type = 'brand' AND be.brand_id = '${brandId}'))`;
    } else {
      filter += ` AND be.brain_type = 'cubo'`;
    }
  }

  // Fetch candidate rows (all matching chunks — we rank in JS)
  const rows = await sql.unsafe(`
    SELECT
      be.id,
      be.source_id,
      bs.title AS source_title,
      be.brain_type,
      be.chunk_index,
      be.content,
      be.embedding
    FROM brain_embeddings be
    JOIN brain_sources bs ON bs.id = be.source_id
    WHERE ${filter}
  `);

  // Rank by cosine similarity
  const scored: BrainChunk[] = [];
  for (const row of rows as any[]) {
    let sim = 0;
    if (row.embedding) {
      try {
        const vec: number[] = typeof row.embedding === "string"
          ? JSON.parse(row.embedding)
          : row.embedding;
        sim = cosineSim(queryEmbedding, vec);
      } catch {
        sim = 0;
      }
    }
    scored.push({
      source_id:    row.source_id,
      source_title: row.source_title,
      brain_type:   row.brain_type,
      chunk_index:  row.chunk_index,
      content:      row.content,
      similarity:   sim,
    });
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}

/**
 * Build a context string from chunks for injecting into a Claude prompt.
 */
export function buildContext(chunks: BrainChunk[]): string {
  if (chunks.length === 0) return "";

  const sections = chunks.map((c, i) =>
    `[${i + 1}] (${c.brain_type === "cubo" ? "Metodología Cubo" : "Marca"} · ${c.source_title})\n${c.content}`
  );

  return `--- CONTEXTO DE CONOCIMIENTO ---\n${sections.join("\n\n")}\n--- FIN CONTEXTO ---`;
}
