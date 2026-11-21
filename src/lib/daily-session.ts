import { linePlaybackWindow, normalizeLineStarts } from "@/lib/audio";
import { signedTextAudioUrl } from "@/lib/audio-storage";
import type { CorpusClient } from "@/lib/corpus/write";
import {
  DAILY_DUE_CAP,
  MORE_BATCH,
  newSlotsLeft,
  orderDue,
  pickTodayDue,
  startOfUtcDay,
  streakDays,
} from "@/lib/review";
import { countEnrolledToday } from "@/lib/session-data";
import { splitTextLines } from "@/lib/text-lines";

export type DailyCard = {
  /** Stable client key: example id (a card is one example). */
  key: string;
  kind: "due" | "new";
  reviewId: string | null;
  exampleId: string;
  arabic: string;
  translation: string | null;
  textId: string | null;
  textTitle: string | null;
  sourceLine: number | null;
  contextBefore: string | null;
  contextAfter: string | null;
  audioUrl: string | null;
  startMs: number | null;
  endMs: number | null;
};

export type DailySession = {
  cards: DailyCard[];
  /** Distinct cards graded today before this page load. */
  doneToday: number;
  streak: number;
};

type TextJoin = {
  id: string;
  title: string;
  arabic: string;
  audio_path: string | null;
  audio_duration_ms: number | null;
  audio_line_starts_ms: number[] | null;
  created_at?: string;
};

type ExampleRow = {
  id: string;
  arabic: string;
  translation: string | null;
  source_line: number | null;
  text_id: string | null;
  created_at?: string;
  texts: TextJoin | TextJoin[] | null;
};

const TEXT_COLS =
  "id, title, arabic, audio_path, audio_duration_ms, audio_line_starts_ms";
const EXAMPLE_COLS = `id, arabic, translation, source_line, text_id, texts(${TEXT_COLS})`;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function neighbour(lines: string[], from: number, step: -1 | 1): string | null {
  for (let i = from + step; i >= 0 && i < lines.length; i += step) {
    const line = lines[i]?.trim();
    if (line) return line;
  }
  return null;
}

async function toCards(
  supabase: CorpusClient,
  rows: Array<{
    kind: DailyCard["kind"];
    reviewId: string | null;
    example: ExampleRow;
  }>,
): Promise<DailyCard[]> {
  const paths = [
    ...new Set(
      rows
        .map((row) => one(row.example.texts)?.audio_path)
        .filter((path): path is string => Boolean(path)),
    ),
  ];
  const urls = new Map(
    await Promise.all(
      paths.map(
        async (path) =>
          [path, await signedTextAudioUrl(supabase, path)] as const,
      ),
    ),
  );
  return rows.map(({ kind, reviewId, example }) => {
    const text = one(example.texts);
    const line = example.source_line;
    const lines = text?.arabic ? splitTextLines(text.arabic) : [];
    const span =
      line != null
        ? linePlaybackWindow(
            normalizeLineStarts(text?.audio_line_starts_ms),
            line,
            text?.audio_duration_ms ?? null,
          )
        : null;
    return {
      key: example.id,
      kind,
      reviewId,
      exampleId: example.id,
      arabic: example.arabic,
      translation: example.translation,
      textId: text?.id ?? example.text_id,
      textTitle: text?.title ?? null,
      sourceLine: line,
      contextBefore: line != null ? neighbour(lines, line - 1, -1) : null,
      contextAfter: line != null ? neighbour(lines, line - 1, 1) : null,
      audioUrl: text?.audio_path ? (urls.get(text.audio_path) ?? null) : null,
      startMs: span?.startMs ?? null,
      endMs: span?.endMs ?? null,
    };
  });
}

async function loadDueStubs(supabase: CorpusClient, now: Date) {
  const { data, error } = await supabase
    .from("review_items")
    .select("id, due, state")
    .lte("due", now.toISOString());
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadDueByIds(
  supabase: CorpusClient,
  ids: string[],
): Promise<DailyCard[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("review_items")
    .select(`id, examples(${EXAMPLE_COLS})`)
    .in("id", ids);
  if (error) throw new Error(error.message);
  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  const rows = ids.flatMap((id) => {
    const example = one(
      byId.get(id)?.examples as ExampleRow | ExampleRow[] | null,
    );
    return example ? [{ kind: "due" as const, reviewId: id, example }] : [];
  });
  return toCards(supabase, rows);
}

/**
 * New cards: examples not in review yet. Text-linked lines come first (most
 * recent text first, oldest line first so the dialogue reads in order), then
 * standalone examples, newest first.
 */
async function loadNewCards(
  supabase: CorpusClient,
  limit: number,
  excludeExampleIds: string[] = [],
): Promise<DailyCard[]> {
  if (limit <= 0) return [];
  let query = supabase
    .from("examples")
    .select(
      `${EXAMPLE_COLS.replace("texts(", "texts(created_at, ")}, created_at, review_items(id)`,
    )
    .is("review_items", null)
    .order("created_at", { ascending: false })
    .limit(80);
  if (excludeExampleIds.length > 0) {
    query = query.not("id", "in", `(${excludeExampleIds.join(",")})`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as unknown as ExampleRow[])
    .map((example) => ({ example, text: one(example.texts) }))
    .sort((a, b) => {
      if (Boolean(a.text) !== Boolean(b.text)) return a.text ? -1 : 1;
      if (!a.text || !b.text) {
        return (b.example.created_at ?? "").localeCompare(
          a.example.created_at ?? "",
        );
      }
      const byText = (b.text?.created_at ?? "").localeCompare(
        a.text?.created_at ?? "",
      );
      if (byText !== 0) return byText;
      if (a.example.text_id !== b.example.text_id) {
        return (a.example.text_id ?? "").localeCompare(b.example.text_id ?? "");
      }
      return (a.example.source_line ?? 0) - (b.example.source_line ?? 0);
    })
    .slice(0, limit)
    .map(({ example }) => ({ kind: "new" as const, reviewId: null, example }));
  return toCards(supabase, rows);
}

async function loadLogDays(supabase: CorpusClient) {
  const { data, error } = await supabase
    .from("review_log")
    .select("review_item_id, was_new, reviewed_on")
    .order("reviewed_on", { ascending: false })
    .limit(3000);
  // Streak/cap bookkeeping is non-critical: never block the cards on it.
  if (error) {
    console.error("review_log unavailable:", error.message);
    return [];
  }
  return data ?? [];
}

export async function loadDailySession(
  supabase: CorpusClient,
  now = new Date(),
): Promise<DailySession> {
  const [stubs, log, enrolledToday] = await Promise.all([
    loadDueStubs(supabase, now),
    loadLogDays(supabase),
    countEnrolledToday(supabase, now),
  ]);
  const today = startOfUtcDay(now).toISOString().slice(0, 10);
  const todayRows = log.filter((row) => row.reviewed_on === today);
  const doneToday = new Set(todayRows.map((row) => row.review_item_id)).size;
  const reviewedDueToday = new Set(
    todayRows.filter((row) => !row.was_new).map((row) => row.review_item_id),
  ).size;

  const dueIds = pickTodayDue(stubs, reviewedDueToday, DAILY_DUE_CAP).map(
    (stub) => stub.id,
  );
  const [due, fresh] = await Promise.all([
    loadDueByIds(supabase, dueIds),
    loadNewCards(supabase, newSlotsLeft(enrolledToday)),
  ]);

  return {
    cards: [...due, ...fresh],
    doneToday,
    streak: streakDays(
      log.map((row) => row.reviewed_on),
      now,
    ),
  };
}

/** "+5 more": next due cards past today's cap, else new ones (cap waived). */
export async function loadMoreCards(
  supabase: CorpusClient,
  excludeExampleIds: string[],
  excludeReviewIds: string[],
  now = new Date(),
): Promise<DailyCard[]> {
  const skip = new Set(excludeReviewIds);
  const stubs = orderDue(
    (await loadDueStubs(supabase, now)).filter((stub) => !skip.has(stub.id)),
  );
  const due = await loadDueByIds(
    supabase,
    stubs.slice(0, MORE_BATCH).map((stub) => stub.id),
  );
  const fresh = await loadNewCards(
    supabase,
    MORE_BATCH - due.length,
    excludeExampleIds,
  );
  return [...due, ...fresh];
}
