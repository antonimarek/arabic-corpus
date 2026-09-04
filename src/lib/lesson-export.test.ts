import { describe, expect, it } from "vitest";

import {
  aiReviewBundle,
  buildLessonExport,
  corpusImportBundle,
  dialogueToMarkdown,
} from "@/lib/lesson-export";
import { buildStudyPack } from "@/lib/transcribe/study-pack";
import type { DialogueTurn } from "@/lib/transcribe/align";

function turn(partial: Partial<DialogueTurn> & Pick<DialogueTurn, "role" | "text">): DialogueTurn {
  return {
    startSeconds: 0,
    endSeconds: 5,
    timestampLabel: "1:00",
    speaker: partial.role === "TUTOR" ? "Speaker 2" : "Student",
    fathomText: partial.text,
    sttText: partial.text,
    wisprText: "",
    source: "stt",
    similarity: 1,
    ...partial,
  };
}

const arabic = `[TUTOR] اليوم الجاي means next time.
[STUDENT] What means بفضل?`;

describe("dialogueToMarkdown", () => {
  it("formats dialogue with split Arabic and English", () => {
    const md = dialogueToMarkdown(arabic, {
      title: "Lesson — example",
      occurredOn: "2026-08-31",
    }, [60_000, 120_000]);

    expect(md).toContain("# Lesson — example");
    expect(md).toContain("**Arabic:** اليوم الجاي");
    expect(md).toContain("**English:** means next time");
    expect(md).toContain("Line 1 · Tutor · 1:00");
    expect(md).toContain("Line 2 · You");
  });
});

describe("buildLessonExport", () => {
  it("builds study pack markdown", () => {
    const pack = buildStudyPack("lesson-1", [
      turn({ role: "STUDENT", text: "What means بفضل?", timestampLabel: "2:00" }),
    ]);
    const md = buildLessonExport(
      "study-pack",
      arabic,
      pack,
      { title: "Lesson" },
    );
    expect(md).toContain("## Confusion moments");
  });

  it("builds corpus import bundle with instructions and study hints", () => {
    const pack = buildStudyPack("lesson-1", [
      turn({ role: "TUTOR", text: "اليوم الجاي means next time.", timestampLabel: "1:00" }),
    ]);
    const md = buildLessonExport(
      "corpus-import",
      arabic,
      pack,
      { title: "Lesson — example" },
    );

    expect(md).toContain("Lesson transcript");
    expect(md).toContain("## Dialogue");
    expect(md).toContain("Study hints");
    expect(md).toContain("patterns");
  });

  it("builds ai review bundle with prompt and candidates", () => {
    const pack = buildStudyPack("lesson-1", [
      turn({ role: "TUTOR", text: "اليوم الجاي means next time.", timestampLabel: "1:00" }),
    ]);
    const md = buildLessonExport(
      "ai-review",
      arabic,
      pack,
      { title: "Lesson — example" },
    );

    expect(md).toContain("Levantine Arabic");
    expect(md).toContain("## Dialogue");
    expect(md).toContain("Heuristic study candidates");
    expect(md).toContain("## Produce cold");
    expect(md).toContain("## This week");
  });
});

describe("corpusImportBundle", () => {
  it("places dialogue before study hints", () => {
    const pack = buildStudyPack("lesson-1", []);
    const md = corpusImportBundle(arabic, pack, { title: "T" });
    const dialogueIndex = md.indexOf("## Dialogue");
    const hintsIndex = md.indexOf("Study hints");
    expect(dialogueIndex).toBeGreaterThan(-1);
    expect(hintsIndex).toBeGreaterThan(dialogueIndex);
  });
});

describe("aiReviewBundle", () => {
  it("includes transcript before heuristic section", () => {
    const pack = buildStudyPack("lesson-1", []);
    const md = aiReviewBundle(arabic, pack, { title: "T" });
    const dialogueIndex = md.indexOf("## Dialogue");
    const heuristicIndex = md.indexOf("Heuristic study candidates");
    expect(dialogueIndex).toBeGreaterThan(-1);
    expect(heuristicIndex).toBeGreaterThan(dialogueIndex);
  });
});
