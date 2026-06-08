import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY no está configurada en las variables de entorno.");
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const MODEL = "text-embedding-3-small"; // 1536 dims, cheap & fast

/** Embed a single text string → float array of 1536 dims */
export async function embedText(text: string): Promise<number[]> {
  const client = getClient();
  const res = await client.embeddings.create({
    model: MODEL,
    input: text.slice(0, 8191), // model token limit
  });
  return res.data[0].embedding;
}

/** Embed multiple texts in one API call (more efficient) */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getClient();
  // OpenAI allows up to 2048 inputs per request
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    batches.push(texts.slice(i, i + 100));
  }

  const results: number[][] = [];
  for (const batch of batches) {
    const res = await client.embeddings.create({
      model: MODEL,
      input: batch.map((t) => t.slice(0, 8191)),
    });
    results.push(...res.data.map((d) => d.embedding));
  }
  return results;
}
