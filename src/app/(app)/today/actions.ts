"use server";

import { revalidatePath } from "next/cache";

import {
  enrollDueAt,
  gradeStoredCard,
  newStoredCard,
  parseReviewGrade,
  type ReviewGrade,
} from "@/lib/review";
import { countEnrolledToday } from "@/lib/session-data";
import { requireUserId } from "@/lib/require-user";

function revalidateReview(textId?: string | null) {
  revalidatePath("/");
  revalidatePath("/today");
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
  const example = Array.isArray(item.examples)
    ? item.examples[0]
    : item.examples;
  revalidateReview(example?.text_id);
  return {};
}
