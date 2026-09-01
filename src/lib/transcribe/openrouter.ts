import { readFile, unlink } from "node:fs/promises";
import path from "node:path";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/audio/transcriptions";

export type TranscribeOptions = {
  apiKey: string;
  model: string;
  audioPath: string;
  language?: string;
  chunkSeconds?: number;
  chunkOverlapSeconds?: number;
  prompt?: string;
};

export type TranscribeUsage = {
  seconds?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost?: number;
};

export type TranscribeResult = {
  model: string;
  language?: string;
  text: string;
  usage: TranscribeUsage;
  chunks: Array<{
    index: number;
    startSeconds: number;
    durationSeconds: number;
    text: string;
    usage?: TranscribeUsage;
    error?: string;
  }>;
  rawResponses: unknown[];
};

type SttResponse = {
  text?: string;
  usage?: TranscribeUsage;
  error?: { message?: string };
};

function audioFormat(filePath: string): string {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (!ext) return "m4a";
  return ext === "mp4" ? "m4a" : ext;
}

function mergeChunkText(chunks: string[]): string {
  return chunks
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

async function transcribeOnce(params: {
  apiKey: string;
  model: string;
  audioPath: string;
  language?: string;
  prompt?: string;
}): Promise<SttResponse> {
  const buffer = await readFile(params.audioPath);
  const form = new FormData();
  form.append("model", params.model);
  form.append("file", new Blob([buffer]), path.basename(params.audioPath));
  if (params.language) form.append("language", params.language);
  if (params.prompt) form.append("prompt", params.prompt);

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "HTTP-Referer": "https://github.com/arabic-corpus",
      "X-Title": "arabic-corpus transcribe benchmark",
    },
    body: form,
  });

  const body = (await response.json()) as SttResponse & { message?: string };
  if (!response.ok) {
    const message =
      body.error?.message ?? body.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

export async function transcribeAudio(
  options: TranscribeOptions,
): Promise<TranscribeResult> {
  const chunkSeconds = options.chunkSeconds ?? 0;
  const chunkOverlapSeconds = options.chunkOverlapSeconds ?? 3;

  if (chunkSeconds <= 0) {
    const raw = await transcribeOnce(options);
    return {
      model: options.model,
      language: options.language,
      text: raw.text?.trim() ?? "",
      usage: raw.usage ?? {},
      chunks: [
        {
          index: 0,
          startSeconds: 0,
          durationSeconds: raw.usage?.seconds ?? 0,
          text: raw.text?.trim() ?? "",
          usage: raw.usage,
        },
      ],
      rawResponses: [raw],
    };
  }

  const { extractClip, probeDurationSeconds } = await import("./ffmpeg");
  const totalSeconds = await probeDurationSeconds(options.audioPath);
  const chunks: TranscribeResult["chunks"] = [];
  const rawResponses: unknown[] = [];
  const usageTotals: TranscribeUsage = {};
  let index = 0;

  for (let start = 0; start < totalSeconds; start += chunkSeconds - chunkOverlapSeconds) {
    const durationSeconds = Math.min(chunkSeconds, totalSeconds - start);
    if (durationSeconds <= 0) break;

    const chunkPath = `${options.audioPath}.chunk-${index}.m4a`;
    await extractClip({
      inputPath: options.audioPath,
      outputPath: chunkPath,
      startSeconds: start,
      durationSeconds,
    });

    try {
      const raw = await transcribeOnce({ ...options, audioPath: chunkPath });
      rawResponses.push(raw);
      chunks.push({
        index,
        startSeconds: start,
        durationSeconds,
        text: raw.text?.trim() ?? "",
        usage: raw.usage,
      });
      if (raw.usage?.seconds) {
        usageTotals.seconds = (usageTotals.seconds ?? 0) + raw.usage.seconds;
      }
      if (raw.usage?.cost) {
        usageTotals.cost = (usageTotals.cost ?? 0) + raw.usage.cost;
      }
      if (raw.usage?.total_tokens) {
        usageTotals.total_tokens =
          (usageTotals.total_tokens ?? 0) + raw.usage.total_tokens;
      }
    } catch (error) {
      chunks.push({
        index,
        startSeconds: start,
        durationSeconds,
        text: "",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await unlink(chunkPath).catch(() => undefined);
    }

    index += 1;
    if (start + durationSeconds >= totalSeconds) break;
  }

  return {
    model: options.model,
    language: options.language,
    text: mergeChunkText(chunks.map((chunk) => chunk.text)),
    usage: usageTotals,
    chunks,
    rawResponses,
  };
}

export function modelSlug(model: string): string {
  return model.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}
