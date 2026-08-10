"use server";

import { revalidatePath } from "next/cache";

import type { ReviewDecision } from "@/lib/import/schema";
import { createFilesystemStagingStore } from "@/lib/import/staging";
import { requireUserId } from "@/lib/require-user";

export type DecisionFormState = {
  error?: string;
  ok?: boolean;
};

export async function setImportDecision(
  importRunId: string,
  stagingId: string,
  _prev: DecisionFormState,
  formData: FormData,
): Promise<DecisionFormState> {
  await requireUserId();
  const decision = String(formData.get("decision") ?? "") as ReviewDecision;
  if (
    decision !== "keep" &&
    decision !== "duplicate" &&
    decision !== "skip"
  ) {
    return { error: "Invalid decision." };
  }

  const store = createFilesystemStagingStore();
  try {
    await store.setDecision(importRunId, stagingId, decision);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not save decision.",
    };
  }

  revalidatePath(`/admin/imports/${importRunId}`);
  revalidatePath("/admin/imports");
  return { ok: true };
}
