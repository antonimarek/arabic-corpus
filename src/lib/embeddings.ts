import { getEmbeddingApiKey, getEmbeddingModel } from "@/lib/env";

export function isEmbeddingConfigured(): boolean {
  return Boolean(getEmbeddingApiKey());
}

export async function embedQueryText(
  text: string,
): Promise<number[] | null> {
  const apiKey = getEmbeddingApiKey();
  if (!apiKey) return null;

  const model = getEmbeddingModel();
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: { embedding?: number[] }[];
  };
  const embedding = payload.data?.[0]?.embedding;
  if (!embedding || embedding.length !== 1536) {
    throw new Error("Unexpected embedding dimensions (need 1536).");
  }
  return embedding;
}

export async function embedDocuments(
  texts: string[],
): Promise<number[][]> {
  const apiKey = getEmbeddingApiKey();
  if (!apiKey) {
    throw new Error("Embedding API key is not configured.");
  }
  if (texts.length === 0) return [];

  const model = getEmbeddingModel();
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: texts,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: { embedding?: number[]; index: number }[];
  };

  const rows = [...(payload.data ?? [])].sort((a, b) => a.index - b.index);
  return rows.map((row) => {
    if (!row.embedding || row.embedding.length !== 1536) {
      throw new Error("Unexpected embedding dimensions (need 1536).");
    }
    return row.embedding;
  });
}
