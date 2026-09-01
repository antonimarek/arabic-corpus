#!/usr/bin/env npx tsx
/**
 * Transcribe a full lesson with one OpenRouter STT model.
 *
 * Usage:
 *   npm run transcribe:lesson -- \
 *     --audio "/path/to/lesson.m4a" \
 *     --lesson lesson-2026-08-31
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { probeDurationSeconds } from "../../src/lib/transcribe/ffmpeg";
import {
  parseFathomTranscript,
  toDialogueMarkdown,
} from "../../src/lib/transcribe/fathom-parse";
import {
  modelSlug,
  transcribeAudio,
} from "../../src/lib/transcribe/openrouter";

type LessonConfig = {
  model?: string;
  prompt?: string;
  chunkSeconds?: number;
  chunkOverlapSeconds?: number;
};

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function usage(): never {
  console.error(`Usage:
  npm run transcribe:lesson -- --audio <path> --lesson <id> [options]

Options:
  --audio              Path to lesson audio
  --lesson             Lesson id (output folder name)
  --model              OpenRouter STT model (default: openai/gpt-transcribe)
  --config             Config JSON (default: import/configs/transcribe-benchmark.example.json)
  --language           ISO-639-1 hint, e.g. ar
  --fathom-transcript  Fathom MCP transcript with speaker labels
  --fathom-recording-id Optional recording_id metadata
`);
  process.exit(1);
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function resolvePath(fileArg: string): string {
  return path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
}

async function loadConfig(configArg: string | undefined): Promise<LessonConfig> {
  const configPath = resolvePath(
    configArg ?? "import/configs/transcribe-benchmark.example.json",
  );
  return JSON.parse(await readFile(configPath, "utf8")) as LessonConfig;
}

async function main() {
  loadEnvLocal();

  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) usage();

  const audioArg = argValue(args, "--audio");
  const lesson = argValue(args, "--lesson");
  if (!audioArg || !lesson) usage();

  const config = await loadConfig(argValue(args, "--config"));
  const model = argValue(args, "--model") ?? config.model ?? "openai/gpt-transcribe";
  const language = argValue(args, "--language");
  const fathomTranscriptArg = argValue(args, "--fathom-transcript");
  const fathomRecordingId = argValue(args, "--fathom-recording-id");

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENROUTER_API_KEY in .env.local");
    process.exit(1);
  }

  const audioPath = resolvePath(audioArg);
  if (!existsSync(audioPath)) {
    console.error(`Audio not found: ${audioPath}`);
    process.exit(1);
  }

  const lessonDir = path.join(process.cwd(), "import/processed/lessons", lesson);
  await mkdir(lessonDir, { recursive: true });

  const durationSeconds = await probeDurationSeconds(audioPath);
  console.log(`Audio: ${audioPath} (${(durationSeconds / 60).toFixed(1)} min)`);
  console.log(`Model: ${model}`);

  const result = await transcribeAudio({
    apiKey,
    model,
    audioPath,
    language,
    prompt: config.prompt,
    chunkSeconds: config.chunkSeconds ?? 120,
    chunkOverlapSeconds: config.chunkOverlapSeconds ?? 3,
  });

  const verbatim = {
    lesson,
    model,
    language: language ?? "auto",
    audioPath,
    durationSeconds,
    text: result.text,
    usage: result.usage,
    chunks: result.chunks,
    createdAt: new Date().toISOString(),
  };

  const jsonPath = path.join(lessonDir, "lesson_verbatim.json");
  const txtPath = path.join(lessonDir, "lesson_transcript.txt");
  await writeFile(jsonPath, `${JSON.stringify(verbatim, null, 2)}\n`);
  await writeFile(txtPath, `${result.text}\n`);

  let fathomMeta: Record<string, unknown> | null = null;
  if (fathomTranscriptArg) {
    const fathomPath = resolvePath(fathomTranscriptArg);
    const fathomRaw = await readFile(fathomPath, "utf8");
    const segments = parseFathomTranscript(fathomRaw);
    const fathomJsonPath = path.join(lessonDir, "fathom.transcript.json");
    const fathomMdPath = path.join(lessonDir, "fathom.dialogue.md");
    await writeFile(fathomJsonPath, `${JSON.stringify(segments, null, 2)}\n`);
    await writeFile(fathomMdPath, `${toDialogueMarkdown(segments)}\n`);
    fathomMeta = {
      sourcePath: fathomPath,
      recordingId: fathomRecordingId ?? null,
      segmentCount: segments.length,
      dialogueMarkdown: path.relative(process.cwd(), fathomMdPath),
    };
  }

  const manifestPath = path.join(lessonDir, "lesson_manifest.json");
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        lesson,
        model,
        language: language ?? "auto",
        audioPath,
        durationSeconds,
        cost: result.usage.cost ?? null,
        outputs: {
          verbatimJson: path.relative(process.cwd(), jsonPath),
          transcriptText: path.relative(process.cwd(), txtPath),
        },
        fathom: fathomMeta,
        chunkErrors: result.chunks.filter((chunk) => chunk.error).length,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );

  const cost = result.usage.cost;
  console.log(`Transcript: ${txtPath}`);
  console.log(`Verbatim:   ${jsonPath}`);
  if (typeof cost === "number") console.log(`Cost:       $${cost.toFixed(6)}`);
  if (result.chunks.some((chunk) => chunk.error)) {
    console.error(
      `${result.chunks.filter((chunk) => chunk.error).length} chunk error(s) — inspect lesson_verbatim.json`,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
