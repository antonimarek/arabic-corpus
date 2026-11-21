"use server";

import { revalidatePath } from "next/cache";

import {
  enrollDueAt,
  gradeStoredCard,
  newStoredCard,
  parseReviewGrade,
  type ReviewGrade,
} from "@/lib/review";
import { loadMoreCards, type DailyCard } from "@/lib/daily-session";
import { countEnrolledToday } from "@/lib/session-data";
import { requireUserId } from "@/lib/require-user";

// /today is deliberately not revalidated: the session keeps its own optimistic
// state, and revalidating the current path re-renders the whole page in the
// action response (that made every grade wait for a full /today render).
function revalidateReview(textId?: string | null) {
  revalidatePath("/");
  revalidatePath("/examples");
  if (textId) revalidatePath(`/texts/${textId}`);
}

export async function enrollExample(
  exampleId: string,
): Promise<{ error?: string; deferred?: boolean }> {
  const { supabase, userId } = await requireUserId();
  const { data: existing } = await supabase
    .from("review_items")
    .select("id")
    .eq("example_id", exampleId)
    .maybeSingle();
  if (existing) return {};

  const { data: example } = await supabase
    .from("examples")
    .select("id, text_id")
    .eq("id", exampleId)
    .maybeSingle();
  if (!example) return { error: "Example not found." };

  const enrolledToday = await countEnrolledToday(supabase);
  const now = new Date();
  const due = enrollDueAt(now, enrolledToday);
  const card = newStoredCard(due);
  const { error } = await supabase.from("review_items").insert({
    owner_id: userId,
    example_id: exampleId,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review_at: card.last_review_at,
  });
  if (error) return { error: error.message };
  revalidateReview(example.text_id);
  return { deferred: due.getTime() > now.getTime() };
}

export async function gradeReview(
  reviewId: string,
  gradeRaw: string,
): Promise<{ error?: string }> {
  const grade: ReviewGrade | null = parseReviewGrade(gradeRaw);
  if (!grade) return { error: "Unknown grade." };
  const { supabase } = await requireUserId();
  const { data: item, error: loadError } = await supabase
    .from("review_items")
    .select(
      "id, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review_at, examples(text_id)",
    )
    .eq("id", reviewId)
    .maybeSingle();
  if (loadError) return { error: loadError.message };
  if (!item) return { error: "Review item not found." };

  const next = gradeStoredCard(
    {
      due: item.due,
      stability: item.stability,
      difficulty: item.difficulty,
      elapsed_days: item.elapsed_days,
      scheduled_days: item.scheduled_days,
      learning_steps: item.learning_steps,
      reps: item.reps,
      lapses: item.lapses,
      state: item.state,
      last_review_at: item.last_review_at,
    },
    grade,
  );
  const { error } = await supabase
    .from("review_items")
    .update({
      due: next.due,
      stability: next.stability,
      difficulty: next.difficulty,
      elapsed_days: next.elapsed_days,
      scheduled_days: next.scheduled_days,
      learning_steps: next.learning_steps,
      reps: next.reps,
      lapses: next.lapses,
      state: next.state,
      last_review_at: next.last_review_at,
    })
    .eq("id", reviewId);
  if (error) return { error: error.message };
  await logReview(supabase, reviewId, grade, false);
  const example = Array.isArray(item.examples)
    ? item.examples[0]
    : item.examples;
  revalidateReview(example?.text_id);
  return {};
}

type Supabase = Awaited<ReturnType<typeof requireUserId>>["supabase"];

async function logReview(
  supabase: Supabase,
  reviewItemId: string,
  grade: ReviewGrade,
  wasNew: boolean,
) {
  // Streak + daily cap bookkeeping. A failed log must not fail the grade.
  await supabase
    .from("review_log")
    .insert({ review_item_id: reviewItemId, grade, was_new: wasNew });
}

/**
 * Grade a daily-session card. New cards (no reviewId) are enrolled on their
 * first grade, so skipping a new card never adds it to review.
 */
export async function gradeCard(input: {
  reviewId: string | null;
  exampleId: string;
  grade: string;
}): Promise<{ error?: string; reviewId?: string }> {
  const grade = parseReviewGrade(input.grade);
  if (!grade) return { error: "Unknown grade." };
  if (input.reviewId) {
    const result = await gradeReview(input.reviewId, grade);
    return result.error ? result : { reviewId: input.reviewId };
  }

  const { supabase, userId } = await requireUserId();
  const { data: existing } = await supabase
    .from("review_items")
    .select("id")
    .eq("example_id", input.exampleId)
    .maybeSingle();
  if (existing) {
    const result = await gradeReview(existing.id, grade);
    return result.error ? result : { reviewId: existing.id };
  }

  const now = new Date();
  const card = gradeStoredCard(newStoredCard(now), grade, now);
  const { data: inserted, error } = await supabase
    .from("review_items")
    .insert({ owner_id: userId, example_id: input.exampleId, ...card })
    .select("id, examples(text_id)")
    .single();
  if (error) return { error: error.message };
  await logReview(supabase, inserted.id, grade, true);
  const example = Array.isArray(inserted.examples)
    ? inserted.examples[0]
    : inserted.examples;
  revalidateReview(example?.text_id);
  return { reviewId: inserted.id };
}

export async function moreCards(input: {
  exampleIds: string[];
  reviewIds: string[];
}): Promise<{ error?: string; cards?: DailyCard[] }> {
  const { supabase } = await requireUserId();
  try {
    const ids = (list: string[]) =>
      list.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 500);
    return {
      cards: await loadMoreCards(
        supabase,
        ids(input.exampleIds),
        ids(input.reviewIds),
      ),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed." };
  }
}
