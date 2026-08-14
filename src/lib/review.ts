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
