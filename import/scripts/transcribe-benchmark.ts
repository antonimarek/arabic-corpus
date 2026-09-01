#!/usr/bin/env npx tsx
/**
 * Benchmark OpenRouter STT models on a lesson audio clip.
 *
 * Usage:
 *   npm run transcribe:benchmark -- \
 *     --audio "/path/to/lesson.m4a" \
 *     --lesson lesson-2026-08-31
 *
 * Requires OPENROUTER_API_KEY in .env.local (never commit it).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { extractClip, probeDurationSeconds } from "../../src/lib/transcribe/ffmpeg";
import {
  parseFathomTranscript,
  segmentsInWindow,
  toDialogueMarkdown,
} from "../../src/lib/transcribe/fathom-parse";
import {
  modelSlug,
  transcribeAudio,
  type TranscribeResult,
} from "../../src/lib/transcribe/openrouter";

type BenchmarkConfig = {
  models: string[];
  prompt?: string;
  defaultStartSeconds?: number;
  defaultDurationSeconds?: number;
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
  npm run transcribe:benchmark -- --audio <path> --lesson <id> [options]

Options:
  --audio           Path to lesson audio (absolute or under raw/)
  --lesson          Lesson id for output folder (e.g. lesson-2026-08-31)
  --config          Benchmark config JSON (default: import/configs/transcribe-benchmark.example.json)
  --start           Clip start in seconds (default from config, usually 900)
  --duration        Clip duration in seconds (default from config, usually 300)
  --models          Comma-separated model slugs (overrides config)
  --language        ISO-639-1 hint, e.g. ar
  --language-ab     Run each model twice: auto-detect and --language ar
  --no-chunk        Send clip as one request (default chunks long clips)
  --fathom-transcript  Fathom MCP/export transcript with speaker labels
  --fathom-recording-id Optional recording_id metadata for manifest
  --dry-run         Prepare clip and manifest only; no API calls
`);
  process.exit(1);
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function resolvePath(fileArg: string): string {
  return path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
}

async function loadConfig(configArg: string | undefined): Promise<BenchmarkConfig> {
  const configPath = resolvePath(
    configArg ?? "import/configs/transcribe-benchmark.example.json",
  );
  return JSON.parse(await readFile(configPath, "utf8")) as BenchmarkConfig;
}

function formatSeconds(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildSummaryMarkdown(params: {
  lesson: string;
  audioPath: string;
  clipPath: string;
  startSeconds: number;
  durationSeconds: number;
  runs: Array<{
    label: string;
    model: string;
    language?: string;
    result: TranscribeResult;
    error?: string;
  }>;
}): string {
  const lines: string[] = [
    `# Transcription benchmark — ${params.lesson}`,
    "",
    `- Source audio: \`${params.audioPath}\``,
    `- Clip: \`${params.clipPath}\``,
    `- Window: ${formatSeconds(params.startSeconds)} → ${formatSeconds(params.startSeconds + params.durationSeconds)} (${params.durationSeconds}s)`,
    "",
    "## Results",
    "",
  ];

  for (const run of params.runs) {
    lines.push(`### ${run.label}`);
    lines.push("");
    lines.push(`- Model: \`${run.model}\``);
    if (run.language) lines.push(`- Language hint: \`${run.language}\``);
    if (run.error) {
      lines.push(`- Error: ${run.error}`);
      lines.push("");
      continue;
    }
    const cost = run.result.usage.cost;
    const seconds = run.result.usage.seconds;
    if (typeof cost === "number") lines.push(`- Cost: $${cost.toFixed(6)}`);
    if (typeof seconds === "number") lines.push(`- Billed seconds: ${seconds.toFixed(1)}`);
    if (run.result.chunks.some((chunk) => chunk.error)) {
      lines.push(`- Chunk errors: ${run.result.chunks.filter((chunk) => chunk.error).length}`);
    }
    lines.push("");
    lines.push("```text");
    lines.push(run.result.text || "(empty)");
    lines.push("```");
    lines.push("");
  }

  lines.push("## Compare");
  lines.push("");
  lines.push(
    "Score each run on: Arabic script quality, dialect preservation, English retention, code-switch handling.",
  );
  lines.push("");
  return lines.join("\n");
}

async function main() {
  loadEnvLocal();

  const args = process.argv.slice(2);
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) usage();

  const audioArg = argValue(args, "--audio");
  const lesson = argValue(args, "--lesson");
  if (!audioArg || !lesson) usage();

  const config = await loadConfig(argValue(args, "--config"));
  const modelsArg = argValue(args, "--models");
  const models = modelsArg
    ? modelsArg.split(",").map((model) => model.trim()).filter(Boolean)
    : config.models;
  if (models.length === 0) {
    console.error("No models configured.");
    process.exit(1);
  }

  const startSeconds = Number(
    argValue(args, "--start") ?? config.defaultStartSeconds ?? 900,
  );
  const durationSeconds = Number(
    argValue(args, "--duration") ?? config.defaultDurationSeconds ?? 300,
  );
  const languageHint = argValue(args, "--language");
  const languageAb = hasFlag(args, "--language-ab");
  const noChunk = hasFlag(args, "--no-chunk");
  const dryRun = hasFlag(args, "--dry-run");
  const fathomTranscriptArg = argValue(args, "--fathom-transcript");
  const fathomRecordingId = argValue(args, "--fathom-recording-id");

  const audioPath = resolvePath(audioArg);
  if (!existsSync(audioPath)) {
    console.error(`Audio not found: ${audioPath}`);
    process.exit(1);
  }

  const lessonDir = path.join(process.cwd(), "import/processed/lessons", lesson);
  const benchmarkDir = path.join(lessonDir, "benchmark");
  await mkdir(benchmarkDir, { recursive: true });

  const sourceDuration = await probeDurationSeconds(audioPath);
  if (startSeconds + durationSeconds > sourceDuration) {
    console.error(
      `Clip exceeds source duration (${sourceDuration.toFixed(1)}s). Adjust --start/--duration.`,
    );
    process.exit(1);
  }

  const clipPath = path.join(lessonDir, `clip_${formatSeconds(startSeconds).replace(/:/g, "-")}_${durationSeconds}s.m4a`);
  await extractClip({
    inputPath: audioPath,
    outputPath: clipPath,
    startSeconds,
    durationSeconds,
  });
  console.log(`Clip: ${clipPath}`);

  let fathomMeta: Record<string, unknown> | null = null;
  if (fathomTranscriptArg) {
    const fathomPath = resolvePath(fathomTranscriptArg);
    if (!existsSync(fathomPath)) {
      console.error(`Fathom transcript not found: ${fathomPath}`);
      process.exit(1);
    }

    const fathomRaw = await readFile(fathomPath, "utf8");
    const allSegments = parseFathomTranscript(fathomRaw);
    const clipSegments = segmentsInWindow(allSegments, startSeconds, durationSeconds);

    const fathomJsonPath = path.join(lessonDir, "fathom.transcript.json");
    const fathomClipJsonPath = path.join(benchmarkDir, "fathom.clip.json");
    const fathomClipMdPath = path.join(benchmarkDir, "fathom.clip.md");

    await writeFile(fathomJsonPath, `${JSON.stringify(allSegments, null, 2)}\n`);
    await writeFile(fathomClipJsonPath, `${JSON.stringify(clipSegments, null, 2)}\n`);
    await writeFile(fathomClipMdPath, `${toDialogueMarkdown(clipSegments)}\n`);

    fathomMeta = {
      sourcePath: fathomPath,
      recordingId: fathomRecordingId ?? null,
      segmentCount: allSegments.length,
      clipSegmentCount: clipSegments.length,
      outputs: {
        fullJson: path.relative(process.cwd(), fathomJsonPath),
        clipJson: path.relative(process.cwd(), fathomClipJsonPath),
        clipMarkdown: path.relative(process.cwd(), fathomClipMdPath),
      },
    };

    console.log(
      `Fathom: ${clipSegments.length}/${allSegments.length} segments in clip window`,
    );
  }

  const manifest = {
    lesson,
    audioPath,
    clipPath,
    sourceDurationSeconds: sourceDuration,
    startSeconds,
    durationSeconds,
    models,
    languageAb,
    languageHint: languageHint ?? null,
    chunkSeconds: noChunk ? 0 : (config.chunkSeconds ?? 120),
    chunkOverlapSeconds: config.chunkOverlapSeconds ?? 3,
    prompt: config.prompt ?? null,
    fathom: fathomMeta,
    createdAt: new Date().toISOString(),
    runs: [] as unknown[],
  };

  if (dryRun) {
    const manifestPath = path.join(benchmarkDir, "manifest.dry-run.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Dry run. Manifest: ${manifestPath}`);
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENROUTER_API_KEY in .env.local");
    process.exit(1);
  }

  const languageVariants = languageAb
    ? [undefined, languageHint ?? "ar"]
    : [languageHint];

  const runs: Array<{
    label: string;
    model: string;
    language?: string;
    result: TranscribeResult;
    error?: string;
  }> = [];

  for (const model of models) {
    for (const language of languageVariants) {
      const suffix = language ? `-${language}` : "-auto";
      const label = `${model}${suffix}`;
      const outBase = path.join(benchmarkDir, `${modelSlug(model)}${suffix}`);
      console.log(`Transcribing ${label}...`);

      try {
        const result = await transcribeAudio({
          apiKey,
          model,
          audioPath: clipPath,
          language,
          prompt: config.prompt,
          chunkSeconds: noChunk ? 0 : (config.chunkSeconds ?? 120),
          chunkOverlapSeconds: config.chunkOverlapSeconds ?? 3,
        });

        await writeFile(`${outBase}.json`, `${JSON.stringify(result, null, 2)}\n`);
        await writeFile(`${outBase}.txt`, `${result.text}\n`);

        manifest.runs.push({
          label,
          model,
          language: language ?? "auto",
          outputJson: path.relative(process.cwd(), `${outBase}.json`),
          outputText: path.relative(process.cwd(), `${outBase}.txt`),
          cost: result.usage.cost ?? null,
          seconds: result.usage.seconds ?? null,
        });

        runs.push({ label, model, language, result });
        const cost = result.usage.cost;
        console.log(
          `  done${typeof cost === "number" ? ` ($${cost.toFixed(6)})` : ""}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const failure = { label, model, language, error: message };
        manifest.runs.push(failure);
        runs.push({
          label,
          model,
          language,
          result: {
            model,
            language,
            text: "",
            usage: {},
            chunks: [],
            rawResponses: [],
          },
          error: message,
        });
        console.error(`  failed: ${message}`);
      }
    }
  }

  const manifestPath = path.join(benchmarkDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const summary = buildSummaryMarkdown({
    lesson,
    audioPath,
    clipPath,
    startSeconds,
    durationSeconds,
    runs,
  });
  const summaryPath = path.join(benchmarkDir, "summary.md");
  await writeFile(summaryPath, summary);

  const totalCost = runs.reduce((sum, run) => sum + (run.result.usage.cost ?? 0), 0);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Summary:  ${summaryPath}`);
  if (totalCost > 0) console.log(`Total cost: $${totalCost.toFixed(6)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
