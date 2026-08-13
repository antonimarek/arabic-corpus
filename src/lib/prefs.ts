export const SHOW_TRANSLATION_KEY = "corpus:show-translation";
export const REVIEW_MODE_KEY = "corpus:review-mode";
export const LAST_TEXT_KEY = "corpus:last-text";

export type LastText = {
  id: string;
  title: string;
};

const showTranslationListeners = new Set<() => void>();
const reviewModeListeners = new Set<() => void>();
const lastTextListeners = new Set<() => void>();

let lastTextCache: { raw: string | null; value: LastText | null } = {
  raw: null,
  value: null,
};
let lastTextCacheReady = false;

function notify(listeners: Set<() => void>) {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeShowTranslation(onStoreChange: () => void) {
  showTranslationListeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStoreChange);
  }
  return () => {
    showTranslationListeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStoreChange);
    }
  };
}

export function getShowTranslationSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SHOW_TRANSLATION_KEY) === "1";
}

export function getShowTranslationServerSnapshot(): boolean {
  return false;
}

export function writeShowTranslation(show: boolean): void {
  window.localStorage.setItem(SHOW_TRANSLATION_KEY, show ? "1" : "0");
  notify(showTranslationListeners);
}

export function subscribeReviewMode(onStoreChange: () => void) {
  reviewModeListeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStoreChange);
  }
  return () => {
    reviewModeListeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStoreChange);
    }
  };
}

export function getReviewModeSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(REVIEW_MODE_KEY) === "1";
}

export function getReviewModeServerSnapshot(): boolean {
  return false;
}

export function writeReviewMode(review: boolean): void {
  window.localStorage.setItem(REVIEW_MODE_KEY, review ? "1" : "0");
  notify(reviewModeListeners);
}

export function subscribeLastText(onStoreChange: () => void) {
  lastTextListeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStoreChange);
  }
  return () => {
    lastTextListeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStoreChange);
    }
  };
}

export function readLastText(): LastText | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LAST_TEXT_KEY);
  if (lastTextCacheReady && lastTextCache.raw === raw) {
    return lastTextCache.value;
  }
  let value: LastText | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<LastText>;
      if (
        typeof parsed.id === "string" &&
        parsed.id.length > 0 &&
        typeof parsed.title === "string"
      ) {
        value = { id: parsed.id, title: parsed.title };
      }
    } catch {
      value = null;
    }
  }
  lastTextCache = { raw, value };
  lastTextCacheReady = true;
  return value;
}

export function getLastTextServerSnapshot(): LastText | null {
  return null;
}

export function writeLastText(value: LastText): void {
  const raw = JSON.stringify(value);
  window.localStorage.setItem(LAST_TEXT_KEY, raw);
  lastTextCache = { raw, value };
  lastTextCacheReady = true;
  notify(lastTextListeners);
}
