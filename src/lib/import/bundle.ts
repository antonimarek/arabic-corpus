import { posKind } from "@/lib/citation";
import { IMPORT_ORIGINS, IMPORT_VALUES } from "@/lib/import/origin";
import { normalizeArabic } from "@/lib/import/normalize";
import { z } from "zod";

export const IMPORT_BUNDLE_VERSION = 1;
export const IMPORT_BUNDLE_MAX_ITEMS = 1200;
export const IMPORT_BUNDLE_MAX_BYTES = 1_000_000;

export const IMPORT_ITEM_TYPES = [
  "vocabulary",
  "example",
  "structure",
  "text",
] as const;

export type ImportItemType = (typeof IMPORT_ITEM_TYPES)[number];

export type ImportGloss = {
  text: string;
  lang?: string;
};

export type ImportBundleSource = {
  title?: string;
  notes?: string;
  origin?: string;
  value?: string;
};

export type ImportItem = {
  type: string;
  arabic?: string;
  translation?: string;
  transliteration?: string;
  notes?: string;
  tags?: string[];
  glosses?: ImportGloss[];
  part_of_speech?: string;
  root?: string;
  present?: string;
  plural?: string;
  name?: string;
  arabic_form?: string;
  meaning?: string;
  explanation?: string;
  title?: string;
  source?: string;
  occurred_on?: string;
  structure_names?: string[];
};

export type ImportBundle = {
  version: number;
  source?: ImportBundleSource;
  items: ImportItem[];
};

export type ImportDecision = "keep" | "skip";
export type ImportDecisions = Record<string, ImportDecision>;

export type ImportRunStatus = "uploaded" | "committed" | "failed";

export type ImportRunCounts = {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  created: Array<{ type: ImportItemType; id: string; label: string }>;
  updatedItems: Array<{ type: ImportItemType; id: string; label: string }>;
  failures: Array<{ index: number; error: string }>;
};

const glossSchema = z.object({
  text: z.string(),
  lang: z.string().optional(),
});

const itemSchema = z.object({
  type: z.string().min(1),
  arabic: z.string().optional(),
  translation: z.string().optional(),
  transliteration: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  glosses: z.array(glossSchema).optional(),
  part_of_speech: z.string().optional(),
  root: z.string().optional(),
  present: z.string().optional(),
  plural: z.string().optional(),
  name: z.string().optional(),
  arabic_form: z.string().optional(),
  meaning: z.string().optional(),
  explanation: z.string().optional(),
  title: z.string().optional(),
  source: z.string().optional(),
  occurred_on: z.string().optional(),
  structure_names: z.array(z.string()).optional(),
});

export const importBundleSchema: z.ZodType<ImportBundle> = z.object({
  version: z.coerce.number().pipe(z.literal(IMPORT_BUNDLE_VERSION)),
  source: z
    .object({
      title: z.string().optional(),
      notes: z.string().optional(),
      origin: z.enum(IMPORT_ORIGINS).optional(),
      value: z.enum(IMPORT_VALUES).optional(),
    })
    .optional(),
  items: z.array(itemSchema).min(1).max(IMPORT_BUNDLE_MAX_ITEMS),
});

export const importDecisionsSchema: z.ZodType<ImportDecisions> = z.record(
  z.string(),
  z.enum(["keep", "skip"]),
);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isImportItemType(value: string): value is ImportItemType {
  return (IMPORT_ITEM_TYPES as readonly string[]).includes(value);
}

export function stripJsonFences(raw: string): string {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export type ParseImportBundleResult =
  | { ok: true; bundle: ImportBundle }
  | { ok: false; error: string };

export function parseImportBundle(raw: string): ParseImportBundleResult {
  if (raw.length > IMPORT_BUNDLE_MAX_BYTES) {
    return {
      ok: false,
      error: `JSON is larger than ${IMPORT_BUNDLE_MAX_BYTES} bytes.`,
    };
  }

  const stripped = stripJsonFences(raw);
  if (!stripped) {
    return { ok: false, error: "Paste or upload ImportBundle JSON." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return { ok: false, error: "JSON is not valid." };
  }

  const result = importBundleSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.length ? first.path.join(".") : "bundle";
    return {
      ok: false,
      error: `${path}: ${first?.message ?? "Invalid ImportBundle."}`,
    };
  }

  return { ok: true, bundle: normalizeImportBundle(result.data) };
}

export type ItemAssessment =
  | { ok: true; type: ImportItemType }
  | { ok: false; error: string };

const ARABIC_LETTER_RE = /[\u0600-\u06FF]/;
const CITATION_PAIR_SPLIT_RE = /\s*[-–—/|]\s*/u;

export function splitArabicCitationPair(
  arabic: string,
): { head: string; pair: string } | null {
  const parts = arabic
    .trim()
    .split(CITATION_PAIR_SPLIT_RE)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 2) return null;
  const head = parts[0];
  const pair = parts[1];
  if (!head || !pair) return null;
  if (head.includes(" ") || pair.includes(" ")) return null;
  if (!ARABIC_LETTER_RE.test(head) || !ARABIC_LETTER_RE.test(pair)) return null;
  if (head === pair) return null;
  return { head, pair };
}

function looksLikePresentPair(head: string, pair: string): boolean {
  const headKey = normalizeArabic(head) ?? "";
  const pairKey = normalizeArabic(pair) ?? "";
  if (!headKey || !pairKey) return false;
  for (const prefix of ["ي", "ب"]) {
    if (pairKey.startsWith(prefix) && pairKey.slice(prefix.length) === headKey) {
      return true;
    }
  }
  return false;
}

function explicitPosKind(item: ImportItem): ReturnType<typeof posKind> | null {
  const raw = item.part_of_speech?.trim();
  if (!raw) return null;
  return posKind(raw);
}

export function vocabPairArabic(item: ImportItem): string | null {
  const kind = posKind(item.part_of_speech);
  if (kind === "verb") return item.present?.trim() || null;
  if (kind === "noun") return item.plural?.trim() || null;
  return item.present?.trim() || item.plural?.trim() || null;
}

export function citationWarning(item: ImportItem): string | null {
  if (item.type !== "vocabulary") return null;
  const kind = posKind(item.part_of_speech);
  if (kind === "verb" && !item.present?.trim()) {
    return "Missing present (he).";
  }
  if (kind === "noun" && !item.plural?.trim()) {
    return "Missing plural.";
  }
  return null;
}

export function normalizeImportItem(item: ImportItem): ImportItem {
  if (item.type !== "vocabulary") return item;

  const next: ImportItem = { ...item };
  const split = next.arabic ? splitArabicCitationPair(next.arabic) : null;
  const kind = explicitPosKind(next);

  if (split && kind !== "other") {
    next.arabic = split.head;
    if (kind === "verb" || next.present?.trim()) {
      if (!next.present?.trim()) next.present = split.pair;
      if (!next.part_of_speech?.trim()) next.part_of_speech = "verb";
    } else if (kind === "noun" || next.plural?.trim()) {
      if (!next.plural?.trim()) next.plural = split.pair;
      if (!next.part_of_speech?.trim()) next.part_of_speech = "noun";
    } else if (looksLikePresentPair(split.head, split.pair)) {
      if (!next.present?.trim()) next.present = split.pair;
      next.part_of_speech = "verb";
    } else {
      if (!next.plural?.trim()) next.plural = split.pair;
      next.part_of_speech = "noun";
    }
  }

  if (!next.part_of_speech?.trim()) {
    if (next.present?.trim()) next.part_of_speech = "verb";
    else if (next.plural?.trim()) next.part_of_speech = "noun";
  }

  return next;
}

export function normalizeImportBundle(bundle: ImportBundle): ImportBundle {
  return {
    ...bundle,
    items: bundle.items.map(normalizeImportItem),
  };
}

export function vocabGlosses(item: ImportItem): ImportGloss[] {
  const fromArray = (item.glosses ?? [])
    .map((gloss) => ({
      text: gloss.text.trim(),
      lang: gloss.lang?.trim() || "en",
    }))
    .filter((gloss) => gloss.text.length > 0);
  if (fromArray.length > 0) {
    return fromArray;
  }
  const fallback = item.translation?.trim();
  if (fallback) {
    return [{ text: fallback, lang: "en" }];
  }
  return [];
}

export function assessImportItem(item: ImportItem): ItemAssessment {
  if (!isImportItemType(item.type)) {
    return { ok: false, error: `Unknown type "${item.type}".` };
  }

  if (item.occurred_on?.trim() && !DATE_RE.test(item.occurred_on.trim())) {
    return { ok: false, error: "occurred_on must be YYYY-MM-DD." };
  }

  if (item.type === "vocabulary") {
    if (!item.arabic?.trim()) {
      return { ok: false, error: "Vocabulary needs Arabic." };
    }
    if (vocabGlosses(item).length === 0) {
      return { ok: false, error: "Vocabulary needs at least one gloss." };
    }
    return { ok: true, type: item.type };
  }

  if (item.type === "example") {
    if (!item.arabic?.trim()) {
      return { ok: false, error: "Example needs Arabic." };
    }
    return { ok: true, type: item.type };
  }

  if (item.type === "structure") {
    if (!item.name?.trim()) {
      return { ok: false, error: "Structure needs a name." };
    }
    return { ok: true, type: item.type };
  }

  if (!item.title?.trim() || !item.arabic?.trim()) {
    return { ok: false, error: "Text needs a title and Arabic." };
  }
  return { ok: true, type: item.type };
}

export function matchArabic(item: ImportItem): string | null {
  if (item.type === "structure") {
    const form = item.arabic_form?.trim() || item.arabic?.trim();
    return form || null;
  }
  const arabic = item.arabic?.trim();
  return arabic || null;
}

export function itemLabel(item: ImportItem): string {
  if (item.type === "vocabulary") {
    const head = item.arabic?.trim() || "vocabulary";
    const pair = vocabPairArabic(item);
    return pair ? `${head} - ${pair}` : head;
  }
  if (item.type === "example") {
    return item.arabic?.trim() || "example";
  }
  if (item.type === "structure") {
    return item.name?.trim() || item.arabic_form?.trim() || "structure";
  }
  return item.title?.trim() || item.arabic?.trim() || "text";
}

export function itemSubtitle(item: ImportItem): string | null {
  if (item.type === "vocabulary") {
    return vocabGlosses(item)[0]?.text ?? null;
  }
  if (item.type === "example") {
    return item.translation?.trim() || null;
  }
  if (item.type === "structure") {
    return item.meaning?.trim() || item.arabic_form?.trim() || null;
  }
  return item.translation?.trim() || null;
}

export function hrefForEntity(type: ImportItemType, id: string): string {
  switch (type) {
    case "text":
      return `/texts/${id}`;
    case "example":
      return `/examples/${id}`;
    case "vocabulary":
      return `/vocabulary/${id}`;
    case "structure":
      return `/structures/${id}`;
  }
}

export const IMPORT_BUNDLE_SCHEMA_TEXT = `{
  "version": ${IMPORT_BUNDLE_VERSION},
  "source": { "title": "optional", "notes": "optional", "origin": "lesson | native | book | generated", "value": "high | mid | low" },
  "items": [
    {
      "type": "vocabulary | example | structure | text",
      "arabic": "required for vocabulary, example, text",
      "translation": "optional",
      "transliteration": "optional",
      "notes": "optional",
      "tags": ["optional"],
      "glosses": [{ "text": "required for vocabulary", "lang": "en" }],
      "part_of_speech": "verb | noun | other, required for vocabulary",
      "root": "vocabulary only",
      "present": "required for verbs: present (he)",
      "plural": "required for nouns: plural",
      "name": "required for structure",
      "arabic_form": "structure",
      "meaning": "structure",
      "explanation": "structure",
      "structure_names": ["optional example: names of structure items in this bundle"],
      "title": "required for text",
      "source": "text",
      "occurred_on": "YYYY-MM-DD"
    }
  ]
}`;
