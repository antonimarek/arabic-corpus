import { readLastText } from "@/lib/prefs";
import {
  parseSessionBudget,
  type SessionBudget,
  type SessionStep,
} from "@/lib/session";

export const SESSION_BUDGET_KEY = "corpus:session-budget";
export const SESSION_PROGRESS_KEY = "corpus:session-progress";
export const LAST_FINISHED_TEXT_KEY = "corpus:last-finished-text";

export type SessionProgress = {
  textId: string;
  budget: SessionBudget;
  step: SessionStep;
};

export type FinishedText = {
  id: string;
  title: string;
};

function readJson<T>(key: string): unknown {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readSessionBudget(): SessionBudget {
  if (typeof window === "undefined") return 15;
  return parseSessionBudget(window.localStorage.getItem(SESSION_BUDGET_KEY));
}

export function writeSessionBudget(budget: SessionBudget): void {
  window.localStorage.setItem(SESSION_BUDGET_KEY, String(budget));
}

export function readSessionProgress(): SessionProgress | null {
  const value = readJson<SessionProgress>(SESSION_PROGRESS_KEY);
  if (!value || typeof value !== "object") return null;
  const row = value as SessionProgress;
  if (typeof row.textId !== "string" || row.textId.length === 0) return null;
  const budget = parseSessionBudget(String(row.budget));
  const step = row.step;
  if (
    step !== "listen" &&
    step !== "read" &&
    step !== "retrieve" &&
    step !== "fluency"
  ) {
    return null;
  }
  return { textId: row.textId, budget, step };
}

export function writeSessionProgress(value: SessionProgress): void {
  window.localStorage.setItem(SESSION_PROGRESS_KEY, JSON.stringify(value));
}

export function clearSessionProgress(): void {
  window.localStorage.removeItem(SESSION_PROGRESS_KEY);
}

export function readLastFinishedText(): FinishedText | null {
  const value = readJson<FinishedText>(LAST_FINISHED_TEXT_KEY);
  if (!value || typeof value !== "object") return null;
  const row = value as FinishedText;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  return row;
}

export function writeLastFinishedText(value: FinishedText): void {
  window.localStorage.setItem(LAST_FINISHED_TEXT_KEY, JSON.stringify(value));
}

export type TodayPrefs = {
  budget: SessionBudget;
  lastTextId: string | null;
  unfinished: boolean;
  finishedId: string | null;
};

export const SERVER_TODAY_PREFS: TodayPrefs = {
  budget: 15,
  lastTextId: null,
  unfinished: false,
  finishedId: null,
};

let todayPrefsCache = SERVER_TODAY_PREFS;

export function reuseTodayPrefs(
  previous: TodayPrefs,
  next: TodayPrefs,
): TodayPrefs {
  if (
    previous.budget === next.budget &&
    previous.lastTextId === next.lastTextId &&
    previous.unfinished === next.unfinished &&
    previous.finishedId === next.finishedId
  ) {
    return previous;
  }
  return next;
}

export function getTodayPrefsServerSnapshot(): TodayPrefs {
  return SERVER_TODAY_PREFS;
}

export function readTodayPrefs(): TodayPrefs {
  if (typeof window === "undefined") return SERVER_TODAY_PREFS;
  const progress = readSessionProgress();
  const next: TodayPrefs = {
    budget: readSessionBudget(),
    lastTextId: progress?.textId ?? readLastText()?.id ?? null,
    unfinished: Boolean(progress),
    finishedId: readLastFinishedText()?.id ?? null,
  };
  todayPrefsCache = reuseTodayPrefs(todayPrefsCache, next);
  return todayPrefsCache;
}

export function subscribeTodayPrefs(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}
