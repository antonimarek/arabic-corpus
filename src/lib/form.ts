export function blankToNull(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  return text.length > 0 ? text : null;
}

export function emptyToNull(value: FormDataEntryValue | null): string | null {
  return blankToNull(String(value ?? ""));
}

export function normalizeTagNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export function parseTagNames(raw: FormDataEntryValue | null): string[] {
  return normalizeTagNames(String(raw ?? "").split(","));
}

export function parseIdList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}
