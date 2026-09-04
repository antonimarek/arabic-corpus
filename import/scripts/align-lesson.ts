#!/usr/bin/env npx tsx
/**
 * Align STT transcript to Fathom speaker turns.
 * Optional Wispr Flow transcript supplies better wording on those timed turns.
 *
 * Usage:
 *   npm run transcribe:align -- --lesson lesson-2026-08-31
 *   npm run transcribe:align -- --lesson sep-03-2026 --wispr-transcript import/processed/lessons/sep-03-2026/wispr.transcript.raw.txt
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  alignDialogue,
  dialogueStats,
  dialogueToMarkdown,
  mergeConsecutiveSegments,
  withSegmentEnds,
  type SttChunk,
} from "../../src/lib/transcribe/align";
import { parseFathomTranscript } from "../../src/lib/transcribe/fathom-parse";
import { mapWisprTextOntoFathomSegments } from "../../src/lib/transcribe/wispr-align";
import {
  mergeConsecutiveWisprTurns,
  parseWisprTranscript,
} from "../../src/lib/transcribe/wispr-parse";

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
  --wispr-transcript    Optional Wispr Flow transcript (Name: text)
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
  const wisprArg = argValue(args, "--wispr-transcript");
  const wisprPath = resolvePath(
    wisprArg ?? path.join(lessonDir, "wispr.transcript.raw.txt"),
  );
  const useWispr = Boolean(wisprArg) || existsSync(wisprPath);

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

  const mergeSameSpeaker = !args.includes("--no-merge");
  const withEnds = withSegmentEnds(fathomSegments, verbatim.durationSeconds);
  const segments = mergeSameSpeaker
    ? mergeConsecutiveSegments(withEnds)
    : withEnds;

  let wisprTexts: Array<{ text: string; score: number } | null> | undefined;
  let wisprTurnCount = 0;
  if (useWispr && existsSync(wisprPath)) {
    const wisprTurns = mergeConsecutiveWisprTurns(
      parseWisprTranscript(await readFile(wisprPath, "utf8")),
    );
    wisprTurnCount = wisprTurns.length;
    const mapped = mapWisprTextOntoFathomSegments({
      fathomSegments: segments,
      wisprTurns,
      tutorNames: ["Speaker 2"],
    });
    wisprTexts = mapped.map((item) =>
      item.wisprText
        ? { text: item.wisprText, score: item.wisprScore }
        : null,
    );
  } else if (wisprArg) {
    console.error(`Missing wispr transcript: ${wisprPath}`);
    process.exit(1);
  }

  const turns = alignDialogue({
    fathomSegments: segments,
    sttChunks: verbatim.chunks,
    totalSeconds: verbatim.durationSeconds,
    tutorNames: ["Speaker 2"],
    mergeSameSpeaker: false,
    wisprTexts,
  });

  const stats = dialogueStats(turns);
  const jsonPath = path.join(lessonDir, "lesson_dialogue.json");
  const mdPath = path.join(lessonDir, "lesson_dialogue.md");
  const reviewPath = path.join(lessonDir, "lesson_review_queue.csv");

  await writeFile(
    jsonPath,
    `${JSON.stringify(
      {
        lesson,
        stats,
        wispr: useWispr
          ? { path: path.relative(process.cwd(), wisprPath), turnCount: wisprTurnCount }
          : null,
        turns,
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(mdPath, `${dialogueToMarkdown(turns)}\n`);

  const csvLines = [
    "start_seconds,end_seconds,role,speaker,source,similarity,text,fathom_text,stt_text,wispr_text",
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
        csvEscape(turn.wisprText),
      ].join(","),
    ),
  ];
  await writeFile(reviewPath, `${csvLines.join("\n")}\n`);

  console.log(`Dialogue: ${mdPath}`);
  console.log(`JSON:     ${jsonPath}`);
  console.log(`Review:   ${reviewPath}`);
  if (useWispr) {
    console.log(`Wispr:    ${wisprPath} (${wisprTurnCount} turns after merge)`);
  }
  console.log(
    `Turns: ${stats.turnCount} (${stats.tutorTurns} tutor, ${stats.studentTurns} student, ${stats.wisprTurns} wispr, ${stats.sttTurns} stt, ${stats.mixedTurns} mixed, ${stats.fathomFallbackTurns} fathom fallback)`,
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
