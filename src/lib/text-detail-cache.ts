import type { TextDetailPayload } from "@/lib/text-detail";

const PREFIX = "corpus:text-detail:";
const MAX_AGE_MS = 30 * 60 * 1000;

type Stored = {
  savedAt: number;
  data: TextDetailPayload;
};

function storageKey(id: string): string {
  return `${PREFIX}${id}`;
}

export function readTextDetailCache(id: string): TextDetailPayload | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    if (!raw) return undefined;
    const stored = JSON.parse(raw) as Stored;
    if (!stored?.data || typeof stored.savedAt !== "number") return undefined;
    if (Date.now() - stored.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(storageKey(id));
      return undefined;
    }
    return stored.data;
  } catch {
    return undefined;
  }
}

export function writeTextDetailCache(data: TextDetailPayload): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Stored = { savedAt: Date.now(), data };
    sessionStorage.setItem(storageKey(data.id), JSON.stringify(payload));
  } catch {
    // Quota or private mode — ignore.
  }
}

export function clearTextDetailCache(id: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(id));
  } catch {
    // ignore
  }
}
