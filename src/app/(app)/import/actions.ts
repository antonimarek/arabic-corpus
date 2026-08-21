"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { mapImportItem } from "@/lib/corpus/map-bundle";
import {
  enrichVocabularyRecord,
  isWriteErr,
  writeExample,
  writeStructure,
  writeText,
  writeVocabulary,
} from "@/lib/corpus/write";
import {
  IMPORT_BUNDLE_MAX_BYTES,
  itemLabel,
  parseImportBundle,
  type ImportDecision,
  type ImportRunCounts,
} from "@/lib/import/bundle";
import {
  applyImportProvenance,
  resolveImportProvenance,
  parseImportOrigin,
  parseImportValue,
  provenanceFromBundle,
} from "@/lib/import/origin";
import { findExistingMatches } from "@/lib/import/match";
import { buildPreviewRow } from "@/lib/import/preview";
import { readBundle, readDecisions } from "@/lib/import/run";
import { requireUserId } from "@/lib/require-user";
import type { Json } from "@/types/database";

export type ImportFormState = {
  error?: string;
};

function asJson(value: unknown): Json {
  return value as Json;
}

export async function createImportRun(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const { supabase, userId } = await requireUserId();

  const file = formData.get("file");
  let raw = String(formData.get("json") ?? "");
  let sourceLabel = "Pasted JSON";

  if (file instanceof File && file.size > 0) {
    if (file.size > IMPORT_BUNDLE_MAX_BYTES) {
      return {
        error: `File is larger than ${IMPORT_BUNDLE_MAX_BYTES} bytes.`,
      };
    }
    raw = await file.text();
    sourceLabel = file.name || sourceLabel;
  }

  const parsed = parseImportBundle(raw);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const touched = String(formData.get("origin_touched") ?? "") === "1";
  const { origin, value } = resolveImportProvenance(
    parsed.bundle,
    String(formData.get("origin") ?? ""),
    String(formData.get("value") ?? ""),
    touched,
  );
  const bundle = applyImportProvenance(parsed.bundle, origin, value);

  if (bundle.source?.title?.trim()) {
    sourceLabel = bundle.source.title.trim();
  }

  const { data, error } = await supabase
    .from("import_runs")
    .insert({
      owner_id: userId,
      source_label: sourceLabel,
      bundle: asJson(bundle),
      decisions: asJson({}),
      status: "uploaded",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save import run." };
  }

  revalidatePath("/import");
  redirect(`/import/${data.id}`);
}

export async function setImportRowDecision(
  runId: string,
  index: number,
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const decision = String(formData.get("decision") ?? "") as ImportDecision;
  if (decision !== "keep" && decision !== "skip") {
    return { error: "Invalid decision." };
  }

  const { supabase } = await requireUserId();
  const { data: run, error: loadError } = await supabase
    .from("import_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (loadError || !run) {
    return { error: loadError?.message ?? "Import run not found." };
  }
  if (run.status !== "uploaded") {
    return { error: "This run is already committed." };
  }

  const decisions = readDecisions(run);
  decisions[String(index)] = decision;

  const { error } = await supabase
    .from("import_runs")
    .update({ decisions: asJson(decisions) })
    .eq("id", runId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/import/${runId}`);
  return {};
}

export async function setImportProvenance(
  runId: string,
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const origin = parseImportOrigin(String(formData.get("origin") ?? ""));
  const value = parseImportValue(String(formData.get("value") ?? ""));
  if (!origin || !value) {
    return { error: "Pick a source and a value." };
  }

  const { supabase } = await requireUserId();
  const { data: run, error: loadError } = await supabase
    .from("import_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (loadError || !run) {
    return { error: loadError?.message ?? "Import run not found." };
  }
  if (run.status !== "uploaded") {
    return { error: "This run is already committed." };
  }

  const bundle = applyImportProvenance(readBundle(run), origin, value);
  const { error } = await supabase
    .from("import_runs")
    .update({ bundle: asJson(bundle) })
    .eq("id", runId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/import/${runId}`);
  return {};
}

export async function commitImportRun(
  runId: string,
  _prev: ImportFormState,
): Promise<ImportFormState> {
  const { supabase, userId } = await requireUserId();
  const { data: run, error: loadError } = await supabase
    .from("import_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (loadError || !run) {
    return { error: loadError?.message ?? "Import run not found." };
  }
  if (run.status === "committed") {
    return { error: "This run is already committed." };
  }

  const bundle = readBundle(run);
  const stored = readDecisions(run);
  const { origin, value } = provenanceFromBundle(bundle);
  const stamped = applyImportProvenance(bundle, origin, value);
  const existing = await findExistingMatches(supabase, stamped.items);
  const counts: ImportRunCounts = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    created: [],
    updatedItems: [],
    failures: [],
  };

  for (let index = 0; index < stamped.items.length; index += 1) {
    const item = stamped.items[index];
    const match = existing[index];
    const row = buildPreviewRow(index, item, match, stored[String(index)]);
    if (row.decision === "skip") {
      counts.skipped += 1;
      continue;
    }

    const mapped = mapImportItem(item);
    if ("error" in mapped) {
      counts.failed += 1;
      counts.failures.push({ index, error: mapped.error });
      continue;
    }

    if (match?.vocabulary && mapped.type === "vocabulary") {
      const result = await enrichVocabularyRecord(
        supabase,
        userId,
        match.vocabulary,
        mapped.input,
      );
      if (isWriteErr(result)) {
        counts.failed += 1;
        counts.failures.push({ index, error: result.error });
        continue;
      }
      if (!result.enriched) {
        counts.skipped += 1;
        continue;
      }
      counts.updated += 1;
      counts.updatedItems.push({
        type: mapped.type,
        id: result.id,
        label: itemLabel(item),
      });
      continue;
    }

    if (match) {
      // Non-vocab exact match with keep: still skip insert to avoid duplicates.
      counts.skipped += 1;
      continue;
    }

    let result;
    if (mapped.type === "vocabulary") {
      result = await writeVocabulary(supabase, userId, mapped.input, {
        allowDuplicate: true,
      });
    } else if (mapped.type === "example") {
      result = await writeExample(supabase, userId, mapped.input);
    } else if (mapped.type === "structure") {
      result = await writeStructure(supabase, userId, mapped.input);
    } else {
      result = await writeText(supabase, userId, mapped.input);
    }

    if (isWriteErr(result)) {
      counts.failed += 1;
      counts.failures.push({ index, error: result.error });
      continue;
    }

    counts.inserted += 1;
    counts.created.push({
      type: mapped.type,
      id: result.id,
      label: itemLabel(item),
    });
  }

  const { error } = await supabase
    .from("import_runs")
    .update({
      status: "committed",
      counts: asJson(counts),
      committed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/import");
  revalidatePath(`/import/${runId}`);
  revalidatePath("/vocabulary");
  revalidatePath("/examples");
  revalidatePath("/structures");
  revalidatePath("/texts");
  return {};
}

export async function discardImportRun(runId: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("import_runs").delete().eq("id", runId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/import");
  redirect("/import");
}
