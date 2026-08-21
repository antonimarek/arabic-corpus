import { normalizeTagNames } from "@/lib/form";

export const IMPORT_ORIGINS = [
  "lesson",
  "native",
  "book",
  "generated",
] as const;

export const IMPORT_VALUES = ["high", "mid", "low"] as const;

export type ImportOrigin = (typeof IMPORT_ORIGINS)[number];
export type ImportValue = (typeof IMPORT_VALUES)[number];

type ProvenanceBundle = {
  source?: {
    title?: string;
    notes?: string;
    origin?: string;
    value?: string;
  };
  items: Array<{ tags?: string[] }>;
};

export const ORIGIN_DEFAULT_VALUE: Record<ImportOrigin, ImportValue> = {
  lesson: "high",
  native: "high",
  book: "high",
  generated: "low",
};

export const ORIGIN_COPY: Record<
  ImportOrigin,
  { label: string; hint: string }
> = {
  lesson: { label: "Lesson", hint: "Tutor or class notes" },
  native: { label: "Native", hint: "Heard speech, clips" },
  book: { label: "Book", hint: "Textbook or glossary" },
  generated: { label: "Generated", hint: "Model-made" },
};

export const VALUE_COPY: Record<ImportValue, { label: string; hint: string }> = {
  high: { label: "High", hint: "Prefer in review" },
  mid: { label: "Mid", hint: "Keep, do not prefer" },
  low: { label: "Low", hint: "Filler / generated" },
};

export const VALUE_FACTOR: Record<ImportValue, number> = {
  high: 3,
  mid: 2,
  low: 1,
};

export const ORIGIN_TAG_PREFIX = "origin:";
export const VALUE_TAG_PREFIX = "value:";

export function isImportOrigin(value: string): value is ImportOrigin {
  return (IMPORT_ORIGINS as readonly string[]).includes(value);
}

export function isImportValue(value: string): value is ImportValue {
  return (IMPORT_VALUES as readonly string[]).includes(value);
}

export function parseImportOrigin(
  raw: string | null | undefined,
): ImportOrigin | null {
  const value = raw?.trim().toLowerCase() ?? "";
  return isImportOrigin(value) ? value : null;
}

export function parseImportValue(
  raw: string | null | undefined,
): ImportValue | null {
  const value = raw?.trim().toLowerCase() ?? "";
  return isImportValue(value) ? value : null;
}

export function originTag(origin: ImportOrigin): string {
  return `${ORIGIN_TAG_PREFIX}${origin}`;
}

export function valueTag(value: ImportValue): string {
  return `${VALUE_TAG_PREFIX}${value}`;
}

export function isProvenanceTag(name: string): boolean {
  const tag = name.trim().toLowerCase();
  return (
    tag.startsWith(ORIGIN_TAG_PREFIX) || tag.startsWith(VALUE_TAG_PREFIX)
  );
}

export function originFromTags(
  tags: string[] | null | undefined,
): ImportOrigin | null {
  for (const tag of tags ?? []) {
    const value = tag.trim().toLowerCase();
    if (!value.startsWith(ORIGIN_TAG_PREFIX)) continue;
    return parseImportOrigin(value.slice(ORIGIN_TAG_PREFIX.length));
  }
  return null;
}

export function valueFromTags(
  tags: string[] | null | undefined,
): ImportValue | null {
  for (const tag of tags ?? []) {
    const value = tag.trim().toLowerCase();
    if (!value.startsWith(VALUE_TAG_PREFIX)) continue;
    return parseImportValue(value.slice(VALUE_TAG_PREFIX.length));
  }
  return null;
}

export function valueFactor(value: ImportValue): number {
  return VALUE_FACTOR[value];
}

export function provenanceFromBundle(bundle: {
  source?: { origin?: string; value?: string };
}): {
  origin: ImportOrigin;
  value: ImportValue;
} {
  const origin = parseImportOrigin(bundle.source?.origin) ?? "lesson";
  const value =
    parseImportValue(bundle.source?.value) ?? ORIGIN_DEFAULT_VALUE[origin];
  return { origin, value };
}

export function resolveImportProvenance(
  bundle: { source?: { origin?: string; value?: string } },
  formOrigin: string | null | undefined,
  formValue: string | null | undefined,
  touched: boolean,
): { origin: ImportOrigin; value: ImportValue } {
  const json = provenanceFromBundle(bundle);
  if (!touched && parseImportOrigin(bundle.source?.origin)) {
    return json;
  }
  const origin = parseImportOrigin(formOrigin) ?? json.origin;
  const value = parseImportValue(formValue) ?? ORIGIN_DEFAULT_VALUE[origin];
  return { origin, value };
}

export function applyImportProvenance<T extends ProvenanceBundle>(
  bundle: T,
  origin: ImportOrigin,
  value: ImportValue,
): T & {
  source: NonNullable<ProvenanceBundle["source"]> & {
    origin: ImportOrigin;
    value: ImportValue;
  };
} {
  return {
    ...bundle,
    source: {
      ...bundle.source,
      origin,
      value,
    },
    items: bundle.items.map((item) => stampItemProvenance(item, origin, value)),
  } as T & {
    source: NonNullable<ProvenanceBundle["source"]> & {
      origin: ImportOrigin;
      value: ImportValue;
    };
  };
}

function stampItemProvenance<T extends { tags?: string[] }>(
  item: T,
  origin: ImportOrigin,
  value: ImportValue,
): T {
  return {
    ...item,
    tags: normalizeTagNames([
      ...(item.tags ?? []).filter((tag) => !isProvenanceTag(tag)),
      originTag(origin),
      valueTag(value),
    ]),
  };
}
