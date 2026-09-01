"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/require-user";

const MAX_AI_STUDY_PLAN_CHARS = 100_000;

export type AiStudyPlanState = {
  error?: string;
  ok?: boolean;
};

export async function saveAiStudyPlan(
  textId: string,
  content: string,
): Promise<AiStudyPlanState> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Paste a study plan before saving." };
  }
  if (trimmed.length > MAX_AI_STUDY_PLAN_CHARS) {
    return { error: "Study plan is too long (max 100,000 characters)." };
  }

  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("texts")
    .update({ ai_study_plan: trimmed })
    .eq("id", textId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/texts/${textId}`);
  revalidatePath("/texts");
  return { ok: true };
}

export async function clearAiStudyPlan(textId: string): Promise<AiStudyPlanState> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("texts")
    .update({ ai_study_plan: null })
    .eq("id", textId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/texts/${textId}`);
  revalidatePath("/texts");
  return { ok: true };
}
