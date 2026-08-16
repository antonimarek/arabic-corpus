import {
  IMPORT_BUNDLE_VERSION,
  parseImportBundle,
  type ImportBundle,
  type ImportItem,
} from "@/lib/import/bundle";

export const SHWAYY_SOURCE_PREFIX = "shwayy-an-haali";

export const SHWAYY_SPEAKERS = [
  { arabic: "هدى", english: "Hoda", city: "Lebanese" },
  { arabic: "راين", english: "Rani", city: "Lebanese" },
  { arabic: "منى", english: "Mona", city: "Lebanese" },
  { arabic: "إبراهيم", english: "Ibrahim", city: "Lebanese" },
  { arabic: "همسة", english: "Hamsa", city: "Lebanese" },
  { arabic: "أيهم", english: "Ayham", city: "Syrian" },
  { arabic: "نور", english: "Nour", city: "Syrian" },
  { arabic: "عالء الدين", english: "Aladdin", city: "Syrian" },
  { arabic: "أماين", english: "Amani", city: "Syrian" },
  { arabic: "عامر", english: "Ammar", city: "Syrian" },
] as const;

const SPEAKER_ALIASES: Record<string, string> = {
  "علاء الدين": "عالء الدين",
  أماني: "أماين",
  Amer: "Ammar",
};

const SPEAKER_AR_SET = new Set([
  ...SHWAYY_SPEAKERS.map((row) => row.arabic),
  ...Object.keys(SPEAKER_ALIASES),
]);

const SPEAKER_AR_RE = [...SPEAKER_AR_SET]
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join("|");

const SPEAKER_LINE_RE = new RegExp(`^(${SPEAKER_AR_RE})\\s*:\\s*(.*)$`);

const SPEAKER_EN_RE =
  /^(Hoda|Rani|Mona|Ibrahim|Hamsa|Ayham|Nour|Aladdin|Amani|Ammar|Amer)\s+[LS]\s*$/;

const SPEAKER_EN_INLINE_RE =
  /^(.*\S)\s+(Hoda|Rani|Mona|Ibrahim|Hamsa|Ayham|Nour|Aladdin|Amani|Ammar|Amer)\s+[LS]\s*$/;

const FOOTER_RE = /^(©|\|\s*\d+|\d+|\d+\s*\|.*)$/;
const JUNK_LINE_RE = /visit our website/i;
const TOC_RE = /^(\d+)\.\s+(.+?)\s+\.{3,}/;

export type ShwayyAnswer = {
  speaker: string;
  arabic: string;
};

export type ShwayySection = {
  index: number;
  questions: string[];
  answers: ShwayyAnswer[];
};

export type ShwayyEnglishHit = {
  speaker: string;
  translation: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripBidi(value: string): string {
  return value.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");
}

export function tidyArabic(value: string): string {
  let next = stripBidi(value);
  next = next.replace(/\s+/g, " ").trim();
  next = next.replace(/\s+([.،,؟!])/g, "$1");
  next = next.replace(/([.،,؟!])(\S)/g, "$1 $2");
  next = next.replace(/\s+\d+\s*\|.*$/u, "").trim();
  return next;
}

export function canonicalSpeakerAr(name: string): string {
  return SPEAKER_ALIASES[name] ?? name;
}

export function canonicalSpeakerEn(name: string): string {
  return name === "Amer" ? "Ammar" : name;
}

function isComplete(section: ShwayySection): boolean {
  const last = section.answers.at(-1);
  return section.answers.length >= 10 && Boolean(last?.arabic.trim());
}

export function parseShwayyAppendix(raw: string): ShwayySection[] {
  const text = stripBidi(raw);
  const sections: ShwayySection[] = [];
  let current: ShwayySection = { index: 1, questions: [], answers: [] };

  const startSection = (firstQuestion?: string) => {
    current = {
      index: sections.length + 1,
      questions: firstQuestion ? [firstQuestion] : [],
      answers: [],
    };
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\f/g, "").trim();
    if (!line || FOOTER_RE.test(line) || JUNK_LINE_RE.test(line)) continue;

    const speakerMatch = line.match(SPEAKER_LINE_RE);
    if (speakerMatch) {
      if (isComplete(current)) {
        sections.push(current);
        startSection();
      }
      current.answers.push({
        speaker: canonicalSpeakerAr(speakerMatch[1]),
        arabic: tidyArabic(speakerMatch[2] ?? ""),
      });
      continue;
    }

    if (current.answers.length === 0) {
      if (!current.questions.includes(line)) current.questions.push(line);
      continue;
    }

    const looksLikeQuestion = /[؟?]$/.test(line);
    if (isComplete(current) && looksLikeQuestion) {
      sections.push(current);
      startSection(line);
      continue;
    }

    const last = current.answers.at(-1);
    if (last) last.arabic = tidyArabic(`${last.arabic} ${line}`);
  }

  if (current.answers.length > 0) sections.push(current);
  return sections.map((section, index) => ({
    ...section,
    index: index + 1,
    questions: section.questions.filter((row) => /[؟?]$/.test(row)),
  }));
}

function hasArabic(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

function latinRatio(value: string): number {
  const letters = [...value].filter((char) => /\p{L}/u.test(char));
  if (letters.length === 0) return 0;
  const latin = letters.filter((char) => char.charCodeAt(0) < 128).length;
  return latin / letters.length;
}

function isGlossLine(value: string): boolean {
  if (/[āáēêīíōúʔɣʂʈħɧ]/.test(value)) return true;
  if (/\b(pl\.|m\.|f\.|lit\.|coll\.)\b/.test(value)) return true;
  if (hasArabic(value)) return true;
  if (/^[LS]\s/.test(value)) return true;
  return false;
}

function isEnglishSentence(value: string): boolean {
  if (isGlossLine(value)) return false;
  const letters = [...value].filter((char) => /\p{L}/u.test(char));
  if (letters.length < 8) return false;
  const first = value[0];
  return latinRatio(value) > 0.9 && Boolean(first && /[A-Z“"]/.test(first));
}

function isEnglishContinuation(value: string): boolean {
  if (isGlossLine(value)) return false;
  const letters = [...value].filter((char) => /\p{L}/u.test(char));
  return latinRatio(value) >= 0.85 && letters.length >= 3;
}

export function parseShwayyEnglish(raw: string): ShwayyEnglishHit[] {
  const hits: ShwayyEnglishHit[] = [];
  const buf: string[] = [];
  const flush = (speaker: string) => {
    const translation = buf.join(" ").replace(/\s+/g, " ").trim();
    buf.length = 0;
    if (!translation) return;
    hits.push({ speaker: canonicalSpeakerEn(speaker), translation });
  };

  for (const rawLine of stripBidi(raw).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const label = line.match(SPEAKER_EN_RE);
    if (label) {
      flush(label[1]);
      continue;
    }

    const inline = line.match(SPEAKER_EN_INLINE_RE);
    if (
      inline &&
      (isEnglishSentence(inline[1]) ||
        (buf.length > 0 && isEnglishContinuation(inline[1])))
    ) {
      buf.push(inline[1]);
      flush(inline[2]);
      continue;
    }

    if (isEnglishSentence(line) || (buf.length > 0 && isEnglishContinuation(line))) {
      buf.push(line);
      continue;
    }

    if (isGlossLine(line) || hasArabic(line)) {
      buf.length = 0;
    }
  }

  return hits;
}

export function parseShwayyToc(raw: string): string[] {
  const titles: string[] = [];
  for (const rawLine of stripBidi(raw).split(/\r?\n/)) {
    const match = rawLine.trim().match(TOC_RE);
    if (!match) continue;
    const index = Number(match[1]);
    const title = match[2].replace(/\s+/g, " ").trim();
    if (index >= 1 && index <= 30 && title) {
      titles[index - 1] = title;
    }
  }
  return titles;
}

const EXPECTED_EN_ORDER = SHWAYY_SPEAKERS.map((row) => row.english);

/** Only keep English when 10 hits arrive in speaker order. Skip a shifted window. */
export function alignSectionTranslations(
  sectionCount: number,
  hits: ShwayyEnglishHit[],
): (string[] | null)[] {
  const aligned: (string[] | null)[] = Array.from(
    { length: sectionCount },
    () => null,
  );
  let cursor = 0;
  for (let index = 0; index < sectionCount; index += 1) {
    let found = false;
    while (cursor + 10 <= hits.length) {
      const window = hits.slice(cursor, cursor + 10);
      const inOrder = window.every(
        (hit, offset) => hit.speaker === EXPECTED_EN_ORDER[offset],
      );
      if (inOrder) {
        aligned[index] = window.map(
          (hit, offset) => `${EXPECTED_EN_ORDER[offset]}: ${hit.translation}`,
        );
        cursor += 10;
        found = true;
        break;
      }
      cursor += 1;
    }
    if (!found) break;
  }
  return aligned;
}

export function buildShwayyBundle(input: {
  appendix: string;
  english?: string;
  toc?: string;
}): ImportBundle {
  const sections = parseShwayyAppendix(input.appendix);
  const toc = input.toc ? parseShwayyToc(input.toc) : [];
  const translations = alignSectionTranslations(
    sections.length,
    parseShwayyEnglish(input.english ?? ""),
  );

  const items: ImportItem[] = sections.map((section) => {
    const n = String(section.index).padStart(2, "0");
    const englishTitle = toc[section.index - 1];
    const question = section.questions[0] ?? `Q${n}`;
    const title = englishTitle ? `Q${n} · ${englishTitle}` : `Q${n} · ${question}`;
    const arabic = section.answers
      .map((answer) => `${answer.speaker}: ${answer.arabic}`)
      .join("\n");
    const translationLines = translations[section.index - 1];
    const lebanese = SHWAYY_SPEAKERS.filter((row) => row.city === "Lebanese")
      .map((row) => row.english)
      .join(", ");
    const syrian = SHWAYY_SPEAKERS.filter((row) => row.city === "Syrian")
      .map((row) => row.english)
      .join(", ");

    return {
      type: "text",
      title,
      arabic,
      translation: translationLines?.join("\n"),
      source: `${SHWAYY_SOURCE_PREFIX} q${n}`,
      notes: [
        section.questions.length > 0
          ? `سؤال: ${section.questions.join(" / ")}`
          : null,
        `Lebanese: ${lebanese}.`,
        `Syrian: ${syrian}.`,
        "One MP3 per section. Upload on the text. Mark line starts on the 10 answers.",
      ]
        .filter(Boolean)
        .join("\n"),
      tags: ["shwayy"],
    };
  });

  return {
    version: IMPORT_BUNDLE_VERSION,
    source: {
      title: "Shwayy An Haali",
      notes: "Lingualism Appendix C. Personal copy. Do not commit this JSON.",
    },
    items,
  };
}

export function assertShwayyBundle(bundle: ImportBundle): void {
  const parsed = parseImportBundle(JSON.stringify(bundle));
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  if (parsed.bundle.items.length !== 30) {
    throw new Error(`Expected 30 texts, got ${parsed.bundle.items.length}.`);
  }
  for (const item of parsed.bundle.items) {
    const lines = item.arabic?.split("\n") ?? [];
    if (lines.length !== 10) {
      throw new Error(`${item.title}: expected 10 Arabic lines.`);
    }
  }
}
