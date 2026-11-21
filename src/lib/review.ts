import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";

export const DAILY_NEW_CAP = 5;

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export type StoredCard = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review_at: string | null;
};

const scheduler = fsrs({ request_retention: 0.9 });

const GRADE: Record<ReviewGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export function parseReviewGrade(raw: string): ReviewGrade | null {
  if (raw === "again" || raw === "hard" || raw === "good" || raw === "easy") {
    return raw;
  }
  return null;
}

export function startOfUtcDay(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function enrollDueAt(now: Date, enrolledNewToday: number): Date {
  if (enrolledNewToday < DAILY_NEW_CAP) return now;
  const tomorrow = startOfUtcDay(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow;
}

function toStored(card: Card): StoredCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review_at: card.last_review?.toISOString() ?? null,
  };
}

function toCard(stored: StoredCard): Card {
  return {
    due: new Date(stored.due),
    stability: stored.stability,
    difficulty: stored.difficulty,
    elapsed_days: stored.elapsed_days,
    scheduled_days: stored.scheduled_days,
    learning_steps: stored.learning_steps,
    reps: stored.reps,
    lapses: stored.lapses,
    state: stored.state,
    last_review: stored.last_review_at
      ? new Date(stored.last_review_at)
      : undefined,
  };
}

export function newStoredCard(now = new Date()): StoredCard {
  return toStored(createEmptyCard(now));
}

export function gradeStoredCard(
  stored: StoredCard,
  grade: ReviewGrade,
  now = new Date(),
): StoredCard {
  const result = scheduler.next(toCard(stored), now, GRADE[grade]);
  return toStored(result.card);
}

// ---------------------------------------------------------------------------
// Daily session: capped queue, backlog spreading, streak
// ---------------------------------------------------------------------------

export const DAILY_DUE_CAP = 15;
export const MORE_BATCH = 5;

export type DueStub = { id: string; due: string; state: number };

/** FSRS states: 1 Learning, 3 Relearning — short intervals, review first. */
function isLearning(state: number): boolean {
  return state === 1 || state === 3;
}

/** Priority order: learning/relearning first, then most overdue first. */
export function orderDue<T extends DueStub>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const learn = Number(isLearning(b.state)) - Number(isLearning(a.state));
    if (learn !== 0) return learn;
    return a.due.localeCompare(b.due);
  });
}

/**
 * Overflow protection. Spread an overdue pile over the coming days at most
 * `perDay` per day instead of dumping it all on today. Day 0 is today and
 * gets whatever is left of today's cap. Read-time only: nothing in the DB is
 * rescheduled; unpicked cards simply wait, and grading moves them on.
 */
export function spreadBacklog<T extends DueStub>(
  items: T[],
  {
    perDay = DAILY_DUE_CAP,
    reviewedToday = 0,
  }: { perDay?: number; reviewedToday?: number } = {},
): T[][] {
  const ordered = orderDue(items);
  const days: T[][] = [];
  const todayRoom = Math.max(0, perDay - reviewedToday);
  days.push(ordered.slice(0, todayRoom));
  for (let i = todayRoom; i < ordered.length; i += perDay) {
    days.push(ordered.slice(i, i + perDay));
  }
  return days;
}

/** Due cards for today's session, after the cap and what's done today. */
export function pickTodayDue<T extends DueStub>(
  items: T[],
  reviewedToday: number,
  perDay = DAILY_DUE_CAP,
): T[] {
  return spreadBacklog(items, { perDay, reviewedToday })[0] ?? [];
}

/** New cards still allowed today. */
export function newSlotsLeft(enrolledToday: number, cap = DAILY_NEW_CAP): number {
  return Math.max(0, cap - enrolledToday);
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Consecutive active days ending today (or yesterday, so an unfinished today
 * never shows as broken). One graded card counts as a day done.
 */
export function streakDays(activeDays: string[], now = new Date()): number {
  const set = new Set(activeDays);
  const cursor = startOfUtcDay(now);
  if (!set.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
