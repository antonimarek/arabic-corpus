import { z } from "zod";

export const IMPORT_BUNDLE_VERSION = 1;
export const IMPORT_BUNDLE_MAX_ITEMS = 500;
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
  skipped: number;
  failed: number;
  created: Array<{ type: ImportItemType; id: string; label: string }>;
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
});

export const importBundleSchema: z.ZodType<ImportBundle> = z.object({
  version: z.coerce.number().pipe(z.literal(IMPORT_BUNDLE_VERSION)),
  source: z
    .object({
      title: z.string().optional(),
      notes: z.string().optional(),
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

  return { ok: true, bundle: result.data };
}

export type ItemAssessment =
  | { ok: true; type: ImportItemType }
  | { ok: false; error: string };

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
    return item.arabic?.trim() || "vocabulary";
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
  "source": { "title": "optional", "notes": "optional" },
  "items": [
    {
      "type": "vocabulary | example | structure | text",
      "arabic": "required for vocabulary, example, text",
      "translation": "optional",
      "transliteration": "optional",
      "notes": "optional",
      "tags": ["optional"],
      "glosses": [{ "text": "required for vocabulary", "lang": "en" }],
      "part_of_speech": "vocabulary only",
      "root": "vocabulary only",
      "present": "verb present (he), vocabulary only",
      "plural": "noun plural, vocabulary only",
      "name": "required for structure",
      "arabic_form": "structure",
      "meaning": "structure",
      "explanation": "structure",
      "title": "required for text",
      "source": "text",
      "occurred_on": "YYYY-MM-DD"
    }
  ]
}`;
