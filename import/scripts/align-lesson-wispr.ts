#!/usr/bin/env npx tsx
/**
 * Build lesson dialogue + study artifacts from Wispr Flow alone (no Fathom / STT).
 *
 * Usage:
 *   npm run transcribe:align:wispr -- --lesson sep-07-2026
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  dialogueStats,
  dialogueToMarkdown,
} from "../../src/lib/transcribe/align";
import { wisprTurnsToDialogue } from "../../src/lib/transcribe/wispr-dialogue";
import { parseWisprTranscript } from "../../src/lib/transcribe/wispr-parse";
import { buildStudyPack, studyPackToMarkdown } from "../../src/lib/transcribe/study-pack";
import {
  buildCorpusArabicText,
  mergeTurnsByRole,
} from "../../src/lib/transcribe/corpus-format";

function usage(): never {
  console.error(`Usage:
  npm run transcribe:align:wispr -- --lesson <id> [options]

Options:
  --lesson              Lesson id under import/processed/lessons/
  --wispr-transcript    Override wispr.transcript.raw.txt path
  --no-merge            Keep every Wispr line as its own turn
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
  const wisprPath = resolvePath(
    argValue(args, "--wispr-transcript") ??
      path.join(lessonDir, "wispr.transcript.raw.txt"),
  );

  if (!existsSync(wisprPath)) {
    console.error(`Missing wispr transcript: ${wisprPath}`);
    process.exit(1);
  }

  const mergeSameSpeaker = !args.includes("--no-merge");
  const wisprTurns = parseWisprTranscript(await readFile(wisprPath, "utf8"), {
    // Wispr often labels the tutor as Speaker 1 when the student mic is identified.
    // Speaker 1/2 = tutor mic label varies. Speaker 3 / Audio = listening clip.
    tutorNames: ["moayad", "speaker 1", "speaker 2", "speaker 3", "audio"],
  });
  if (wisprTurns.length === 0) {
    console.error("No Wispr turns parsed.");
    process.exit(1);
  }

  const turns = wisprTurnsToDialogue({
    turns: wisprTurns,
    mergeSameSpeaker,
  });
  const stats = dialogueStats(turns);
  const merged = mergeTurnsByRole(turns);
  const arabic = buildCorpusArabicText(merged);
  const studyPack = buildStudyPack(
    lesson,
    turns,
    merged.map((line) => line.timestampLabel),
    {
      wisprArabic: arabic,
      audioSynced: false,
    },
  );

  const jsonPath = path.join(lessonDir, "lesson_dialogue.json");
  const mdPath = path.join(lessonDir, "lesson_dialogue.md");
  const reviewPath = path.join(lessonDir, "lesson_review_queue.csv");
  const studyPackPath = path.join(lessonDir, "lesson_study_pack.md");
  const manifestPath = path.join(lessonDir, "lesson_manifest.json");

  await writeFile(
    jsonPath,
    `${JSON.stringify(
      {
        lesson,
        pipeline: "wispr",
        stats,
        wispr: {
          path: path.relative(process.cwd(), wisprPath),
          turnCount: wisprTurns.length,
          mergedTurnCount: turns.length,
        },
        turns,
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(mdPath, `${dialogueToMarkdown(turns)}\n`);
  await writeFile(studyPackPath, `${studyPackToMarkdown(studyPack)}\n`);

  const csvLines = [
    "timestamp_label,role,speaker,source,text,wispr_text",
    ...turns.map((turn) =>
      [
        turn.timestampLabel,
        turn.role,
        csvEscape(turn.speaker),
        turn.source,
        csvEscape(turn.text),
        csvEscape(turn.wisprText),
      ].join(","),
    ),
  ];
  await writeFile(reviewPath, `${csvLines.join("\n")}\n`);

  const existingManifest = existsSync(manifestPath)
    ? (JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>)
    : {};
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        ...existingManifest,
        lesson,
        pipeline: "wispr",
        wisprTranscript: path.relative(process.cwd(), wisprPath),
        dialogueTurns: turns.length,
        corpusLines: merged.length,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Dialogue: ${mdPath}`);
  console.log(`JSON:     ${jsonPath}`);
  console.log(`Review:   ${reviewPath}`);
  console.log(`Study:    ${studyPackPath}`);
  console.log(`Wispr:    ${wisprPath} (${wisprTurns.length} raw → ${turns.length} dialogue turns)`);
  console.log(
    `Turns: ${stats.turnCount} (${stats.tutorTurns} tutor, ${stats.studentTurns} student, all wispr)`,
  );
  console.log("Next: npm run import:lesson -- --lesson <id> --owner-email <email>");
  console.log("Audio optional for Wispr path (pass --audio if you have a file).");
}

function csvEscape(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
