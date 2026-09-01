import type { DialogueTurn } from "./align";

const ARABIC_RE = /[\u0600-\u06FF]/;
const WHAT_MEANS_RE = /what means|how (?:do you|to) say|i don'?t recognize/i;
const CORRECTION_RE = /أحسنت|not work|don'?t use|instead of|you can say|always for/i;

export type StudyPack = {
  lesson: string;
  generatedAt: string;
  recallPhrases: Array<{ timestamp: string; arabic: string; context: string }>;
  confusionMoments: Array<{ timestamp: string; student: string; tutor?: string }>;
  grammarThreads: Array<{ topic: string; timestamps: string[]; sample: string }>;
  weeklyPlan: string[];
};

function arabicSnippets(text: string, limit = 3): string[] {
  const parts = text.split(/(?<=[.!?؟])\s+/u);
  return parts
    .map((part) => part.trim())
    .filter((part) => ARABIC_RE.test(part) && part.length >= 8)
    .slice(0, limit);
}

function uniqueByArabic<T extends { arabic: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = item.arabic.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function buildStudyPack(lesson: string, turns: DialogueTurn[]): StudyPack {
  const recallPhrases: StudyPack["recallPhrases"] = [];
  const confusionMoments: StudyPack["confusionMoments"] = [];
  const grammarBuckets = new Map<string, { timestamps: string[]; sample: string }>();

  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i];
    if (turn.role === "TUTOR") {
      for (const snippet of arabicSnippets(turn.text)) {
        if (CORRECTION_RE.test(turn.text) || turn.text.length > 40) {
          recallPhrases.push({
            timestamp: turn.timestampLabel,
            arabic: snippet,
            context: turn.text.slice(0, 180),
          });
        }
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
        tutor: turns[i + 1]?.role === "TUTOR" ? turns[i + 1].text.slice(0, 200) : undefined,
      });
    }
  }

  const grammarThreads = [...grammarBuckets.entries()].map(([topic, value]) => ({
    topic,
    timestamps: [...new Set(value.timestamps)].slice(0, 5),
    sample: value.sample.slice(0, 220),
  }));

  return {
    lesson,
    generatedAt: new Date().toISOString(),
    recallPhrases: uniqueByArabic(recallPhrases).slice(0, 12),
    confusionMoments: confusionMoments.slice(0, 10),
    grammarThreads,
    weeklyPlan: [
      "Day 1 (lesson day): skim lesson_study_pack.md only — no heavy study.",
      "Day 2 (~15 min): active recall — cover English side, say Arabic for 5 recall phrases.",
      "Day 4 (~20 min): listening — replay 3 marked timestamps in corpus text reader.",
      "Day 6 (~15 min): output — 3 min Arabic monologue on your week, record yourself.",
      "Before next lesson: review confusion moments; pick 3 items to ask tutor.",
    ],
  };
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
    "## Active recall phrases",
    "",
    "Cover the English cue. Say the Arabic aloud. Check audio at timestamp in corpus.",
    "",
  ];

  if (pack.recallPhrases.length === 0) {
    lines.push("_No phrases extracted — review lesson_dialogue.md manually._", "");
  } else {
    for (const item of pack.recallPhrases) {
      lines.push(`### [${item.timestamp}]`);
      lines.push("");
      lines.push(`- **Arabic:** ${item.arabic}`);
      lines.push(`- **Context:** ${item.context}`);
      lines.push("");
    }
  }

  lines.push("## Confusion moments (priority review)", "");
  if (pack.confusionMoments.length === 0) {
    lines.push("_None auto-detected._", "");
  } else {
    for (const item of pack.confusionMoments) {
      lines.push(`### [${item.timestamp}]`);
      lines.push(`- **You:** ${item.student}`);
      if (item.tutor) lines.push(`- **Tutor:** ${item.tutor}`);
      lines.push("");
    }
  }

  lines.push("## Grammar threads from this lesson", "");
  for (const thread of pack.grammarThreads) {
    lines.push(`### ${thread.topic}`);
    lines.push(`- Timestamps: ${thread.timestamps.join(", ")}`);
    lines.push(`- Sample: ${thread.sample}`);
    lines.push("");
  }

  lines.push("## Rules");
  lines.push("");
  lines.push("- Do not treat the transcript as perfect — verify Arabic against audio.");
  lines.push("- Prefer **active recall** over re-reading.");
  lines.push("- Add only 5–10 Anki cards per lesson, from items you actually struggled with.");
  lines.push("- Promote stable phrases to corpus **examples** after you can say them cold.");

  return lines.join("\n");
}
