import { formatPlaybackClock } from "@/lib/audio";
import { parseDialogueLines, roleLabel } from "@/lib/lesson-dialogue";
import { extractArabicRuns, extractLatinRuns } from "@/lib/mixed-script";
import {
  isStudyPackV2,
  studyPackToMarkdown,
  type StudyPack,
} from "@/lib/transcribe/study-pack";

export type LessonExportMeta = {
  title: string;
  source?: string | null;
  occurredOn?: string | null;
  textId?: string;
};

function lineTimestamp(
  lineNumber: number,
  lineStartsMs: number[] | null | undefined,
): string | null {
  const ms = lineStartsMs?.[lineNumber - 1];
  if (ms == null || ms < 0) return null;
  return formatPlaybackClock(ms);
}

function formatDialogueTurn(
  line: ReturnType<typeof parseDialogueLines>[number],
  lineStartsMs: number[] | null | undefined,
): string[] {
  const parts: string[] = [];
  const clock = lineTimestamp(line.lineNumber, lineStartsMs);
  const role = roleLabel(line.role);
  const heading = clock
    ? `### Line ${line.lineNumber} · ${role} · ${clock}`
    : `### Line ${line.lineNumber} · ${role}`;
  parts.push(heading, "");

  const arabic = extractArabicRuns(line.text).join(" ");
  const english = extractLatinRuns(line.text).join(" ");

  if (arabic) {
    parts.push(`**Arabic:** ${arabic}`);
  }
  if (english) {
    parts.push(`**English:** ${english}`);
  }
  if (!arabic && !english && line.text.trim()) {
    parts.push(line.text.trim());
  }
  parts.push("");
  return parts;
}

export function dialogueToMarkdown(
  arabic: string,
  meta: LessonExportMeta,
  lineStartsMs?: number[] | null,
): string {
  const lines = parseDialogueLines(arabic).filter((line) => line.text.trim().length > 0);
  const body: string[] = [
    `# ${meta.title}`,
    "",
  ];

  if (meta.occurredOn) body.push(`**Date:** ${meta.occurredOn}`);
  if (meta.source) body.push(`**Source:** ${meta.source}`);
  if (meta.textId) body.push(`**Corpus text:** ${meta.textId}`);
  if (meta.occurredOn || meta.source || meta.textId) body.push("");

  body.push(
    "## Dialogue",
    "",
    "_Transcript from lesson recording. Arabic and English are split for clarity. Verify against audio._",
    "",
  );

  for (const line of lines) {
    body.push(...formatDialogueTurn(line, lineStartsMs));
  }

  return body.join("\n").trimEnd() + "\n";
}

export const AI_REVIEW_OUTPUT_SCHEMA = `## Your task

Read the lesson transcript and heuristic study candidates below. Produce a **practical between-lesson plan** for a Levantine Arabic learner.

### Rules
- Write **all explanations, weekly tasks, and notes in English**. Arabic phrases stay in Arabic script. Cues use **Cue (English)** only.
- Prefer **colloquial Levantine** forms from the transcript. Do not normalize to MSA unless the tutor did.
- Do **not** invent Arabic words or phrases not supported by the transcript.
- Mark uncertain items with \`[verify]\` — the transcript may be wrong.
- Cap output: max **7 recall items**, **5 corrections**, **4 contrasts**, **3 questions for next lesson**.
- Focus on what the student **could not produce** or was **corrected** on — not every new word.

### Output format (use exactly these headings)

## This week
3–5 bullet tasks with time estimates (15–20 min each). Concrete actions, not generic advice.

## Produce cold
For each item:
- **Cue (English):** …
- **Say (Arabic):** …
- **Note:** … (optional; include \`[verify]\` if needed)

## Fix these
For each item:
- **You said:** …
- **Better:** …
- **Why:** one short line

## Contrast pairs
Side-by-side pairs the tutor contrasted or that matter for production.

## Ask your tutor next time
3 short questions from real gaps in this lesson.

## Do not study yet
Items that appeared but are low priority — one line each explaining why.`;

export function aiReviewPrompt(): string {
  return `You are helping review a one-to-one **Levantine Arabic** lesson transcript.

The student studies between lessons with active recall, listening, and short speaking practice — not heavy grammar memorization.

${AI_REVIEW_OUTPUT_SCHEMA}`;
}

export function aiReviewBundle(
  arabic: string,
  studyPack: StudyPack,
  meta: LessonExportMeta,
  lineStartsMs?: number[] | null,
): string {
  const sections = [
    aiReviewPrompt(),
    "",
    "---",
    "",
    "# Lesson data",
    "",
    dialogueToMarkdown(arabic, meta, lineStartsMs).trimEnd(),
    "",
    "---",
    "",
    "# Heuristic study candidates (auto-extracted — may be messy or wrong)",
    "",
    "_Use these as hints only. Trust the transcript + audio, not the heuristics blindly._",
    "",
    studyPackToMarkdown(studyPack).trimEnd(),
    "",
    "---",
    "",
    AI_REVIEW_OUTPUT_SCHEMA,
  ];

  return sections.join("\n");
}

export type LessonExportKind = "dialogue" | "study-pack" | "ai-review";

export function buildLessonExport(
  kind: LessonExportKind,
  arabic: string,
  studyPack: StudyPack,
  meta: LessonExportMeta,
  lineStartsMs?: number[] | null,
): string {
  switch (kind) {
    case "dialogue":
      return dialogueToMarkdown(arabic, meta, lineStartsMs);
    case "study-pack":
      return studyPackToMarkdown(studyPack);
    case "ai-review":
      return aiReviewBundle(arabic, studyPack, meta, lineStartsMs);
  }
}
