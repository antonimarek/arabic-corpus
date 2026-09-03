#!/usr/bin/env npx tsx
/**
 * Import aligned lesson dialogue into the corpus (text + audio + line markers).
 *
 * Usage:
 *   npm run import:lesson -- --lesson lesson-2026-08-31 --owner-email you@example.com
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import type { DialogueTurn } from "../../src/lib/transcribe/align";
import {
  buildCorpusArabicText,
  buildCorpusNotes,
  corpusLineStartsMs,
  mergeTurnsByRole,
} from "../../src/lib/transcribe/corpus-format";
import { compressAudioForCorpus, probeDurationSeconds } from "../../src/lib/transcribe/ffmpeg";
import { buildStudyPack, studyPackToMarkdown } from "../../src/lib/transcribe/study-pack";
import { AUDIO_MAX_BYTES, TEXT_AUDIO_BUCKET, textAudioPath } from "../../src/lib/audio";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../../src/lib/env";
import { resolveOwnerId } from "../../src/lib/pattern-discover/run";
import { writeText } from "../../src/lib/corpus/write";
import type { Database } from "../../src/types/database";

type LessonDialogue = {
  lesson: string;
  turns: DialogueTurn[];
};

type LessonManifest = {
  audioPath?: string;
  model?: string;
  durationSeconds?: number;
  fathom?: { recordingId?: string | null };
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
  npm run import:lesson -- --lesson <id> --owner-email <email>

Options:
  --lesson           Lesson id under import/processed/lessons/
  --owner-email      Corpus owner email
  --owner-id         Corpus owner uuid (alternative)
  --audio            Override source audio path
  --title            Text title override
  --occurred-on      ISO date (default: lesson id date if parseable)
  --dry-run          Build study pack + preview only
  --update-study-pack  Update study_pack on existing text (from corpus_import.json)
  --update-dialogue    Rewrite arabic + line markers + study pack on existing text
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

function defaultOccurredOn(lesson: string): string | null {
  const match = /^([a-z]+)-(\d+)-(\d+)$/.exec(lesson);
  if (!match) return null;
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const month = months[match[1] ?? ""];
  if (!month) return null;
  const day = match[2]?.padStart(2, "0");
  const year = match[3];
  return `${year}-${month}-${day}`;
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) usage();

  const lesson = argValue(args, "--lesson");
  if (!lesson) usage();

  const dryRun = args.includes("--dry-run");
  const updateStudyPackOnly = args.includes("--update-study-pack");
  const updateDialogue = args.includes("--update-dialogue");
  const lessonDir = path.join(process.cwd(), "import/processed/lessons", lesson);
  const dialoguePath = path.join(lessonDir, "lesson_dialogue.json");
  const manifestPath = path.join(lessonDir, "lesson_manifest.json");

  if (!existsSync(dialoguePath)) {
    console.error(`Missing ${dialoguePath}. Run transcribe:align first.`);
    process.exit(1);
  }

  const dialogue = JSON.parse(await readFile(dialoguePath, "utf8")) as LessonDialogue;
  const manifest = existsSync(manifestPath)
    ? (JSON.parse(await readFile(manifestPath, "utf8")) as LessonManifest)
    : {};

  const merged = mergeTurnsByRole(dialogue.turns);
  const fathomMerged = mergeTurnsByRole(dialogue.turns, { textField: "fathomText" });
  const arabic = buildCorpusArabicText(merged);
  const fathomArabic = buildCorpusArabicText(fathomMerged);
  const lineStarts = corpusLineStartsMs(merged);
  const studyPack = buildStudyPack(
    lesson,
    dialogue.turns,
    merged.map((line) => line.timestampLabel),
    { fathomArabic },
  );
  const studyPackPath = path.join(lessonDir, "lesson_study_pack.md");
  await writeFile(studyPackPath, `${studyPackToMarkdown(studyPack)}\n`);

  const previewPath = path.join(lessonDir, "corpus_import_preview.json");
  await writeFile(
    previewPath,
    `${JSON.stringify(
      {
        lesson,
        lineCount: merged.length,
        turnCount: dialogue.turns.length,
        firstLines: merged.slice(0, 5).map((line) => ({
          timestamp: line.timestampLabel,
          role: line.role,
          text: line.text.slice(0, 120),
        })),
        studyPackPath: path.relative(process.cwd(), studyPackPath),
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Study pack: ${studyPackPath}`);
  console.log(`Preview:    ${previewPath}`);
  console.log(`Corpus lines: ${merged.length} (from ${dialogue.turns.length} turns)`);

  if (dryRun) {
    console.log("Dry run — no database writes.");
    return;
  }

  const importManifestPath = path.join(lessonDir, "corpus_import.json");
  const existingImport = existsSync(importManifestPath)
    ? (JSON.parse(await readFile(importManifestPath, "utf8")) as {
        textId?: string;
      })
    : null;

  if (updateStudyPackOnly || updateDialogue) {
    const textId = argValue(args, "--text-id") ?? existingImport?.textId;
    if (!textId) {
      console.error("Missing text id. Pass --text-id or import the lesson first.");
      process.exit(1);
    }

    loadEnvLocal();
    const supabase = createClient<Database>(
      getSupabaseUrl(),
      getSupabaseServiceRoleKey(),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const patch = updateDialogue
      ? {
          arabic,
          audio_line_starts_ms: lineStarts,
          study_pack: studyPack,
        }
      : { study_pack: studyPack };

    const { error } = await supabase
      .from("texts")
      .update(patch)
      .eq("id", textId);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }

    console.log(
      updateDialogue
        ? `Updated dialogue + study pack on text id: ${textId}`
        : `Updated study pack on text id: ${textId}`,
    );
    console.log(`Open: /texts/${textId}`);
    return;
  }

  const ownerEmail = argValue(args, "--owner-email");
  const ownerIdArg = argValue(args, "--owner-id");
  if (!ownerEmail && !ownerIdArg) usage();

  const ownerId = await resolveOwnerId({ ownerEmail, ownerId: ownerIdArg });
  const supabase = createClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const title =
    argValue(args, "--title") ??
    `Lesson — ${defaultOccurredOn(lesson) ?? lesson}`;
  const occurredOn =
    argValue(args, "--occurred-on") ?? defaultOccurredOn(lesson);
  const fathomUrl = dialogue.turns.find((turn) => turn.url)?.url?.split("?")[0];

  const textResult = await writeText(supabase, ownerId, {
    title,
    arabic,
    translation: null,
    source: "Levantine lesson (Fathom + gpt-transcribe)",
    occurred_on: occurredOn,
    notes: buildCorpusNotes({
      lesson,
      fathomUrl,
      model: manifest.model,
      turnCount: dialogue.turns.length,
      lineCount: merged.length,
    }),
    tags: ["lesson", "levantine", "dialogue"],
  });

  if ("error" in textResult) {
    console.error(textResult.error);
    process.exit(1);
  }

  const textId = textResult.id;
  const audioSource = resolvePath(
    argValue(args, "--audio") ?? manifest.audioPath ?? "",
  );
  if (!audioSource || !existsSync(audioSource)) {
    console.error("Audio path missing. Pass --audio or ensure lesson_manifest.json has audioPath.");
    process.exit(1);
  }

  const compressedPath = path.join(lessonDir, "lesson_audio_corpus.m4a");
  const compressed = await compressAudioForCorpus(
    audioSource,
    compressedPath,
    AUDIO_MAX_BYTES,
  );
  const durationSeconds = await probeDurationSeconds(compressed.outputPath);
  const durationMs = Math.round(durationSeconds * 1000);
  const storagePath = textAudioPath(ownerId, textId, "m4a");
  const audioBuffer = await readFile(compressed.outputPath);

  const upload = await supabase.storage
    .from(TEXT_AUDIO_BUCKET)
    .upload(storagePath, audioBuffer, {
      contentType: "audio/mp4",
      upsert: true,
    });
  if (upload.error) {
    console.error(upload.error.message);
    process.exit(1);
  }

  const { error: metaError } = await supabase
    .from("texts")
    .update({
      audio_path: storagePath,
      audio_duration_ms: durationMs,
      audio_line_starts_ms: lineStarts,
      study_pack: studyPack,
    })
    .eq("id", textId)
    .eq("owner_id", ownerId);
  if (metaError) {
    console.error(metaError.message);
    process.exit(1);
  }

  await writeFile(
    importManifestPath,
    `${JSON.stringify(
      {
        lesson,
        textId,
        title,
        occurredOn,
        lineCount: merged.length,
        audioBytes: compressed.bytes,
        audioDurationMs: durationMs,
        studyPackPath: path.relative(process.cwd(), studyPackPath),
        importedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Imported text id: ${textId}`);
  console.log(`Audio: ${compressed.bytes} bytes (${(compressed.bytes / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`Open: /texts/${textId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
