/**
 * Text extraction from different source types.
 * Runs server-side only (Node.js runtime).
 */

/** Extract plain text from a URL by stripping HTML */
export async function extractFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CuboBrain/1.0; +https://somosdex.com)",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} al acceder a ${url}`);
  const html = await res.text();

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 60_000); // safety limit
}

/** Extract text from a PDF buffer */
export async function extractFromPdf(buffer: Buffer): Promise<string> {
  // Use internal path to bypass pdf-parse's test-file filesystem access at build time
  // @ts-ignore — no typings for internal path
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  const result = await pdfParse(buffer);
  return result.text.trim();
}

/** Plain text — just normalize whitespace */
export function extractFromText(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n").trim();
}

/**
 * Transcribe audio or video using the self-hosted Whisper ASR service.
 * Supports: mp3, mp4, wav, m4a, ogg, webm, mpeg, mpga
 */
export async function extractFromAudio(buffer: Buffer, filename: string): Promise<string> {
  const whisperUrl = process.env.WHISPER_URL ?? "http://cowork-whisper:9000";

  const form = new FormData();
  form.append(
    "audio_file",
    new Blob([new Uint8Array(buffer)]),
    filename,
  );

  const res = await fetch(`${whisperUrl}/asr?output=txt&language=es`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(300_000), // 5 min max
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Whisper ASR error ${res.status}: ${msg}`);
  }

  return (await res.text()).trim();
}
