#!/usr/bin/env npx tsx
/**
 * Align STT transcript to Fathom speaker turns.
 *
 * Usage:
 *   npm run transcribe:align -- --lesson lesson-2026-08-31
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  alignDialogue,
  dialogueStats,
  dialogueToMarkdown,
  type SttChunk,
} from "../../src/lib/transcribe/align";
import { parseFathomTranscript } from "../../src/lib/transcribe/fathom-parse";

type LessonVerbatim = {
  durationSeconds: number;
  chunks: SttChunk[];
};

function usage(): never {
  console.error(`Usage:
  npm run transcribe:align -- --lesson <id> [options]

Options:
  --lesson              Lesson id under import/processed/lessons/
  --fathom-transcript   Override fathom raw transcript path
  --verbatim            Override lesson_verbatim.json path
  --no-merge            Keep every fathom segment as its own turn
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

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) usage();

  const lesson = argValue(args, "--lesson");
  if (!lesson) usage();

  const lessonDir = path.join(process.cwd(), "import/processed/lessons", lesson);
  const verbatimPath = resolvePath(
    argValue(args, "--verbatim") ?? path.join(lessonDir, "lesson_verbatim.json"),
  );
  const fathomPath = resolvePath(
    argValue(args, "--fathom-transcript") ??
      path.join(lessonDir, "fathom.transcript.raw.txt"),
  );

  if (!existsSync(verbatimPath)) {
    console.error(`Missing verbatim JSON: ${verbatimPath}`);
    process.exit(1);
  }
  if (!existsSync(fathomPath)) {
    console.error(`Missing fathom transcript: ${fathomPath}`);
    process.exit(1);
  }

  const verbatim = JSON.parse(await readFile(verbatimPath, "utf8")) as LessonVerbatim;
  const fathomSegments = parseFathomTranscript(await readFile(fathomPath, "utf8"));
  if (fathomSegments.length === 0) {
    console.error("No fathom segments parsed.");
    process.exit(1);
  }

  const turns = alignDialogue({
    fathomSegments,
    sttChunks: verbatim.chunks,
    totalSeconds: verbatim.durationSeconds,
    tutorNames: ["Speaker 2"],
    mergeSameSpeaker: !args.includes("--no-merge"),
  });

  const stats = dialogueStats(turns);
  const jsonPath = path.join(lessonDir, "lesson_dialogue.json");
  const mdPath = path.join(lessonDir, "lesson_dialogue.md");
  const reviewPath = path.join(lessonDir, "lesson_review_queue.csv");

  await writeFile(
    jsonPath,
    `${JSON.stringify({ lesson, stats, turns }, null, 2)}\n`,
  );
  await writeFile(mdPath, `${dialogueToMarkdown(turns)}\n`);

  const csvLines = [
    "start_seconds,end_seconds,role,speaker,source,similarity,text,fathom_text,stt_text",
    ...turns.map((turn) =>
      [
        turn.startSeconds,
        turn.endSeconds,
        turn.role,
        csvEscape(turn.speaker),
        turn.source,
        turn.similarity.toFixed(3),
        csvEscape(turn.text),
        csvEscape(turn.fathomText),
        csvEscape(turn.sttText),
      ].join(","),
    ),
  ];
  await writeFile(reviewPath, `${csvLines.join("\n")}\n`);

  console.log(`Dialogue: ${mdPath}`);
  console.log(`JSON:     ${jsonPath}`);
  console.log(`Review:   ${reviewPath}`);
  console.log(
    `Turns: ${stats.turnCount} (${stats.tutorTurns} tutor, ${stats.studentTurns} student, ${stats.sttTurns} stt, ${stats.mixedTurns} mixed, ${stats.fathomFallbackTurns} fathom fallback)`,
  );
}

function csvEscape(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
