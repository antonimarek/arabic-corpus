import type { DialogueTurn } from "./align";
import {
  extractArabicRuns,
  longestArabicRun,
  longestLatinRun,
} from "@/lib/mixed-script";

const WHAT_MEANS_RE = /what means|how (?:do you|to) say|i don'?t recognize/i;
const CORRECTION_RE = /أحسنت|not work|don'?t use|instead of|you can say|always for/i;

export type RecallCard = {
  cueEn: string;
  targetAr: string;
  timestamp: string;
  lineNumber: number | null;
};

export type CorrectionCard = {
  youSaid: string;
  tutorSaid: string;
  timestamp: string;
  lineNumber: number | null;
};

export type ContrastCard = {
  a: string;
  b: string;
  note: string;
  timestamps: string[];
};

export type ConfusionMoment = {
  timestamp: string;
  student: string;
  tutor?: string;
  lineNumber: number | null;
};

export type GrammarThread = {
  topic: string;
  timestamps: string[];
  sample: string;
};

/** @deprecated v1 field — kept for read fallback */
export type LegacyRecallPhrase = {
  timestamp: string;
  arabic: string;
  context: string;
};

export type StudyPackV2 = {
  version: 2;
  lesson: string;
  generatedAt: string;
  weeklyPlan: string[];
  recallCards: RecallCard[];
  corrections: CorrectionCard[];
  contrasts: ContrastCard[];
  confusionMoments: ConfusionMoment[];
  grammarThreads: GrammarThread[];
  recallPhrases?: LegacyRecallPhrase[];
};

export type StudyPackV1 = {
  version?: 1;
  lesson: string;
  generatedAt: string;
  weeklyPlan: string[];
  recallPhrases: LegacyRecallPhrase[];
  confusionMoments: Array<{
    timestamp: string;
    student: string;
    tutor?: string;
  }>;
  grammarThreads: GrammarThread[];
};

export type StudyPack = StudyPackV2 | StudyPackV1;

export function isStudyPackV2(pack: StudyPack): pack is StudyPackV2 {
  return pack.version === 2;
}

function uniqueByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

type LineIndex = {
  timestampToLine: Map<string, number>;
};

function buildLineIndex(mergedTimestamps: string[]): LineIndex {
  const timestampToLine = new Map<string, number>();
  mergedTimestamps.forEach((label, index) => {
    timestampToLine.set(label, index + 1);
  });
  return { timestampToLine };
}

function lineForTurn(index: LineIndex, timestamp: string): number | null {
  return index.timestampToLine.get(timestamp) ?? null;
}

const CONTRAST_PATTERNS: Array<{
  pattern: RegExp;
  note: string;
  forms: [RegExp, RegExp];
}> = [
  {
    pattern: /اليوم الجاي|اللي بعده/i,
    note: "اليوم الجاي vs اللي بعده (future vs past)",
    forms: [/اليوم الجاي/u, /اللي بعده/u],
  },
  {
    pattern: /كل يوم|كل اليوم/i,
    note: "كل يوم vs كل اليوم",
    forms: [/كل يوم/u, /كل اليوم/u],
  },
  {
    pattern: /فهمت|بفهم/i,
    note: "فهمت vs بفهم (momentary vs ongoing)",
    forms: [/فهمت/u, /بفهم/u],
  },
];

export function buildStudyPack(
  lesson: string,
  turns: DialogueTurn[],
  mergedTimestamps?: string[],
): StudyPackV2 {
  const lineIndex = buildLineIndex(
    mergedTimestamps ??
      turns.map((turn) => turn.timestampLabel),
  );

  const recallCards: RecallCard[] = [];
  const corrections: CorrectionCard[] = [];
  const contrasts: ContrastCard[] = [];
  const confusionMoments: ConfusionMoment[] = [];
  const grammarBuckets = new Map<string, { timestamps: string[]; sample: string }>();

  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i];

    if (turn.role === "TUTOR") {
      const targetAr = longestArabicRun(turn.text);
      const cueEn = longestLatinRun(turn.text);

      if (
        targetAr.length >= 8 &&
        (CORRECTION_RE.test(turn.text) || turn.text.length > 40)
      ) {
        recallCards.push({
          cueEn: cueEn || "Say in Arabic",
          targetAr,
          timestamp: turn.timestampLabel,
          lineNumber: lineForTurn(lineIndex, turn.timestampLabel),
        });
      }

      const prev = turns[i - 1];
      if (
        prev?.role === "STUDENT" &&
        CORRECTION_RE.test(turn.text) &&
        prev.text.trim().length > 0
      ) {
        corrections.push({
          youSaid: prev.text.trim(),
          tutorSaid: turn.text.trim(),
          timestamp: turn.timestampLabel,
          lineNumber: lineForTurn(lineIndex, turn.timestampLabel),
        });
      }

      for (const contrast of CONTRAST_PATTERNS) {
        if (!contrast.pattern.test(turn.text)) continue;
        const arabicRuns = extractArabicRuns(turn.text);
        const a = arabicRuns.find((run) => contrast.forms[0].test(run));
        const b = arabicRuns.find((run) => contrast.forms[1].test(run));
        if (!a || !b) continue;
        contrasts.push({
          a,
          b,
          note: contrast.note,
          timestamps: [turn.timestampLabel],
        });
      }

      const grammarTopics: Array<[RegExp, string]> = [
        [/اليوم الجاي|اللي بعده|future|past/i, "اليوم الجاي vs اللي بعده (future vs past)"],
        [/أول|تاني|تالت|ordinal|second|third/i, "Ordinal numbers (أول، تاني، تالت…)"],
        [/بفضل|مفضلة|prefer/i, "بفضّل / المفضلة"],
        [/مع الوقت|لاحظت/i, "مع الوقت + لاحظت"],
        [/مرة وحدة|once/i, "مرة وحدة (at once)"],
        [/خطوات صغيرة|فرق كبير/i, "خطوات صغيرة بتعمل فرق كبير"],
        [/فهمت|بفهم/i, "فهمت vs بفهم (momentary vs ongoing)"],
        [/خفّف|كبّر|shadda/i, "Verb from adjective (خفّف، كبّر)"],
        [/مشيت|عملت/i, "مشيت for biking/walking"],
        [/كل يوم|كل اليوم/i, "كل يوم vs كل اليوم"],
      ];

      for (const [pattern, topic] of grammarTopics) {
        if (!pattern.test(turn.text)) continue;
        const bucket = grammarBuckets.get(topic) ?? { timestamps: [], sample: turn.text };
        bucket.timestamps.push(turn.timestampLabel);
        if (!bucket.sample) bucket.sample = turn.text;
        grammarBuckets.set(topic, bucket);
      }
    }

    if (turn.role === "STUDENT" && WHAT_MEANS_RE.test(turn.text)) {
      confusionMoments.push({
        timestamp: turn.timestampLabel,
        student: turn.text.slice(0, 200),
        tutor:
          turns[i + 1]?.role === "TUTOR"
            ? turns[i + 1].text.slice(0, 200)
            : undefined,
        lineNumber: lineForTurn(lineIndex, turn.timestampLabel),
      });
    }
  }

  const grammarThreads = [...grammarBuckets.entries()].map(([topic, value]) => ({
    topic,
    timestamps: [...new Set(value.timestamps)].slice(0, 5),
    sample: value.sample.slice(0, 220),
  }));

  return {
    version: 2,
    lesson,
    generatedAt: new Date().toISOString(),
    recallCards: uniqueByKey(recallCards, (card) => card.targetAr).slice(0, 7),
    corrections: uniqueByKey(
      corrections,
      (card) => `${card.youSaid}|${card.tutorSaid}`,
    ).slice(0, 7),
    contrasts: uniqueByKey(contrasts, (card) => `${card.a}|${card.b}`).slice(0, 5),
    confusionMoments: confusionMoments.slice(0, 10),
    grammarThreads,
    weeklyPlan: [
      "Day 1 (lesson day): skim the Study tab only — no heavy study.",
      "Day 2 (~15 min): active recall — cover the English cue, say Arabic for 5 cards.",
      "Day 4 (~20 min): listening — replay 3 marked timestamps in Dialogue.",
      "Day 6 (~15 min): output — 3 min Arabic monologue on your week, record yourself.",
      "Before next lesson: review confusion moments; pick 3 items to ask tutor.",
    ],
  };
}

export function normalizeStudyPack(value: unknown): StudyPack | null {
  if (!value || typeof value !== "object") return null;
  const pack = value as StudyPack;
  if (!Array.isArray(pack.weeklyPlan)) return null;
  if (pack.version === 2 && Array.isArray((pack as StudyPackV2).recallCards)) {
    return pack as StudyPackV2;
  }
  if (Array.isArray((pack as StudyPackV1).recallPhrases)) {
    return { version: 1, ...(pack as StudyPackV1) };
  }
  return null;
}

export function studyPackToMarkdown(pack: StudyPack): string {
  const lines: string[] = [
    `# Study pack — ${pack.lesson}`,
    "",
    "Generated from your lesson dialogue. Use with the imported corpus text + audio.",
    "",
    "## This week (minimum)",
    "",
    ...pack.weeklyPlan.map((step) => `- ${step}`),
    "",
  ];

  if (isStudyPackV2(pack)) {
    lines.push("## Recall cards", "");
    for (const item of pack.recallCards) {
      lines.push(`### [${item.timestamp}]`);
      lines.push(`- **Cue:** ${item.cueEn}`);
      lines.push(`- **Arabic:** ${item.targetAr}`);
      lines.push("");
    }

    lines.push("## Corrections", "");
    for (const item of pack.corrections) {
      lines.push(`### [${item.timestamp}]`);
      lines.push(`- **You:** ${item.youSaid}`);
      lines.push(`- **Tutor:** ${item.tutorSaid}`);
      lines.push("");
    }

    lines.push("## Contrasts", "");
    for (const item of pack.contrasts) {
      lines.push(`### ${item.note}`);
      lines.push(`- **A:** ${item.a}`);
      lines.push(`- **B:** ${item.b}`);
      lines.push("");
    }
  } else {
    lines.push("## Active recall phrases", "");
    for (const item of pack.recallPhrases) {
      lines.push(`### [${item.timestamp}]`);
      lines.push(`- **Arabic:** ${item.arabic}`);
      lines.push(`- **Context:** ${item.context}`);
      lines.push("");
    }
  }

  lines.push("## Confusion moments (priority review)", "");
  for (const item of pack.confusionMoments) {
    lines.push(`### [${item.timestamp}]`);
    lines.push(`- **You:** ${item.student}`);
    if (item.tutor) lines.push(`- **Tutor:** ${item.tutor}`);
    lines.push("");
  }

  lines.push("## Grammar threads from this lesson", "");
  for (const thread of pack.grammarThreads) {
    lines.push(`### ${thread.topic}`);
    lines.push(`- Timestamps: ${thread.timestamps.join(", ")}`);
    lines.push(`- Sample: ${thread.sample}`);
    lines.push("");
  }

  return lines.join("\n");
}
