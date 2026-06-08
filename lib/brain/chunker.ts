/**
 * Splits text into overlapping chunks suitable for embedding.
 * Target: ~500 tokens per chunk, ~50-token overlap.
 * Rough estimate: 1 token ≈ 4 characters.
 */
export function chunkText(
  text: string,
  chunkSize = 1800,   // chars ≈ 450 tokens
  overlap   = 200,    // chars ≈ 50 tokens
): string[] {
  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (normalized.length <= chunkSize) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    let slice = normalized.slice(start, end);

    // Try to cut at a paragraph or sentence boundary
    if (end < normalized.length) {
      const paraBreak = slice.lastIndexOf("\n\n");
      const sentBreak = slice.search(/[.!?]\s+[A-ZÁÉÍÓÚ]/);
      const cutAt = paraBreak > chunkSize / 2
        ? paraBreak + 2
        : sentBreak > chunkSize / 2
        ? sentBreak + 2
        : slice.length;
      slice = slice.slice(0, cutAt).trim();
    }

    if (slice.length > 80) chunks.push(slice);
    start += Math.max(slice.length - overlap, 1);
  }

  return chunks;
}
