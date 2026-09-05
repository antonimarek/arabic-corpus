import type { SupabaseClient } from "@supabase/supabase-js";

import {
  citationSlotForPos,
  existingWordError,
  type FormSlot,
} from "@/lib/citation";
import {
  planVocabEnrich,
  type ExistingVocabularyState,
} from "@/lib/import/enrich";
import { phraseSearchKey } from "@/lib/lookup-phrase";
import { syncTags } from "@/lib/tags";
import type { Database } from "@/types/database";

export type CorpusClient = SupabaseClient<Database>;

export type ExistingVocabulary = {
  id: string;
  arabic: string;
};

export type VocabularyWriteInput = {
  arabic: string;
  transliteration?: string | null;
  part_of_speech?: string | null;
  notes?: string | null;
  root?: string | null;
  pairArabic?: string | null;
  senses: { gloss: string; lang: string }[];
  tags: string[];
};

export type ExampleWriteInput = {
  arabic: string;
  translation?: string | null;
  transliteration?: string | null;
  notes?: string | null;
  textId?: string | null;
  sourceLine?: number | null;
  vocabularyIds?: string[];
  structureIds?: string[];
  tags: string[];
};

export type StructureWriteInput = {
  name: string;
  arabic_form?: string | null;
  transliteration?: string | null;
  meaning?: string | null;
  explanation?: string | null;
  notes?: string | null;
  exampleIds?: string[];
  tags: string[];
};

export type TextWriteInput = {
  title: string;
  arabic: string;
  translation?: string | null;
  source?: string | null;
  occurred_on?: string | null;
  notes?: string | null;
  tags: string[];
};

export type WriteOk = { id: string };
export type WriteErr = { error: string; existingId?: string };
export type WriteResult = WriteOk | WriteErr;

export function isWriteErr(result: WriteResult): result is WriteErr {
  return "error" in result;
}

export async function findExistingVocabulary(
  supabase: CorpusClient,
  arabic: string,
): Promise<ExistingVocabulary | null> {
  const searchKey = phraseSearchKey(arabic);
  if (!searchKey) return null;
  const { data } = await supabase
    .from("vocabulary")
    .select("id, arabic")
    .eq("search_arabic", searchKey)
    .limit(1)
    .maybeSingle();
  if (data?.id) return { id: data.id, arabic: data.arabic };

  const { data: form } = await supabase
    .from("vocabulary_forms")
    .select("vocabulary_id, vocabulary(id, arabic)")
    .eq("search_arabic", searchKey)
    .limit(1)
    .maybeSingle();
  const vocab = form?.vocabulary;
  if (!vocab) return null;
  return { id: vocab.id, arabic: vocab.arabic };
}

export async function seedTextVocabulary(
  supabase: CorpusClient,
  textId: string,
  vocabularyIds: string[],
): Promise<{ error?: string }> {
  const unique = [...new Set(vocabularyIds.filter(Boolean))];
  if (unique.length === 0) return {};
  const { error } = await supabase.from("text_vocabulary").upsert(
    unique.map((vocabularyId) => ({
      text_id: textId,
      vocabulary_id: vocabularyId,
      role: "focus",
    })),
    { onConflict: "text_id,vocabulary_id", ignoreDuplicates: true },
  );
  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function writeTextVocabulary(
  supabase: CorpusClient,
  textId: string,
  vocabularyId: string,
): Promise<WriteResult> {
  const { error } = await supabase.from("text_vocabulary").upsert(
    {
      text_id: textId,
      vocabulary_id: vocabularyId,
      role: "focus",
    },
    { onConflict: "text_id,vocabulary_id" },
  );
  if (error) {
    return { error: error.message };
  }
  return { id: vocabularyId };
}

export async function deleteTextVocabulary(
  supabase: CorpusClient,
  textId: string,
  vocabularyId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("text_vocabulary")
    .delete()
    .eq("text_id", textId)
    .eq("vocabulary_id", vocabularyId);
  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function writeVocabularyForm(
  supabase: CorpusClient,
  ownerId: string,
  vocabularyId: string,
  arabic: string,
  slot?: FormSlot | null,
): Promise<WriteResult> {
  if (slot) {
    return syncCitationForm(supabase, ownerId, vocabularyId, slot, arabic);
  }

  const searchKey = phraseSearchKey(arabic);
  if (!searchKey) {
    return { error: "Arabic is required." };
  }

  const { data: parent, error: parentError } = await supabase
    .from("vocabulary")
    .select("id, arabic")
    .eq("id", vocabularyId)
    .maybeSingle();
  if (parentError) {
    return { error: parentError.message };
  }
  if (!parent) {
    return { error: "Vocabulary not found." };
  }
  if (phraseSearchKey(parent.arabic) === searchKey) {
    return { error: "This is already the stored form of that word." };
  }

  const existing = await findExistingVocabulary(supabase, arabic);
  if (existing && existing.id !== vocabularyId) {
    return {
      error: "This form already belongs to another word.",
      existingId: existing.id,
    };
  }
  if (existing && existing.id === vocabularyId) {
    return { id: vocabularyId };
  }

  const { error } = await supabase.from("vocabulary_forms").insert({
    vocabulary_id: vocabularyId,
    owner_id: ownerId,
    arabic: arabic.trim(),
  });
  if (error) {
    if (error.code === "23505") {
      return { id: vocabularyId };
    }
    return { error: error.message };
  }
  return { id: vocabularyId };
}

export async function syncCitationForm(
  supabase: CorpusClient,
  ownerId: string,
  vocabularyId: string,
  slot: FormSlot,
  arabic: string | null | undefined,
): Promise<WriteResult> {
  const trimmed = arabic?.trim() ?? "";
  if (!trimmed) {
    const { error } = await supabase
      .from("vocabulary_forms")
      .delete()
      .eq("vocabulary_id", vocabularyId)
      .eq("slot", slot);
    if (error) return { error: error.message };
    return { id: vocabularyId };
  }

  const searchKey = phraseSearchKey(trimmed);
  if (!searchKey) {
    return { error: "Arabic is required." };
  }

  const { data: parent, error: parentError } = await supabase
    .from("vocabulary")
    .select("id, arabic")
    .eq("id", vocabularyId)
    .maybeSingle();
  if (parentError) return { error: parentError.message };
  if (!parent) return { error: "Vocabulary not found." };

  if (phraseSearchKey(parent.arabic) === searchKey) {
    const { error } = await supabase
      .from("vocabulary_forms")
      .delete()
      .eq("vocabulary_id", vocabularyId)
      .eq("slot", slot);
    if (error) return { error: error.message };
    return { id: vocabularyId };
  }

  const existing = await findExistingVocabulary(supabase, trimmed);
  if (existing && existing.id !== vocabularyId) {
    return {
      error: "This form already belongs to another word.",
      existingId: existing.id,
    };
  }

  const [{ data: byKey }, { data: bySlot }] = await Promise.all([
    supabase
      .from("vocabulary_forms")
      .select("id, slot")
      .eq("vocabulary_id", vocabularyId)
      .eq("search_arabic", searchKey)
      .maybeSingle(),
    supabase
      .from("vocabulary_forms")
      .select("id")
      .eq("vocabulary_id", vocabularyId)
      .eq("slot", slot)
      .maybeSingle(),
  ]);

  if (byKey && bySlot && byKey.id !== bySlot.id) {
    const { error: deleteSlotError } = await supabase
      .from("vocabulary_forms")
      .delete()
      .eq("id", bySlot.id);
    if (deleteSlotError) return { error: deleteSlotError.message };
    const { error: updateError } = await supabase
      .from("vocabulary_forms")
      .update({ slot, arabic: trimmed })
      .eq("id", byKey.id);
    if (updateError) return { error: updateError.message };
    return { id: vocabularyId };
  }

  if (byKey) {
    const { error } = await supabase
      .from("vocabulary_forms")
      .update({ slot, arabic: trimmed })
      .eq("id", byKey.id);
    if (error) return { error: error.message };
    return { id: vocabularyId };
  }

  if (bySlot) {
    const { error } = await supabase
      .from("vocabulary_forms")
      .update({ arabic: trimmed })
      .eq("id", bySlot.id);
    if (error) return { error: error.message };
    return { id: vocabularyId };
  }

  const { error } = await supabase.from("vocabulary_forms").insert({
    vocabulary_id: vocabularyId,
    owner_id: ownerId,
    arabic: trimmed,
    slot,
  });
  if (error) {
    if (error.code === "23505") return { id: vocabularyId };
    return { error: error.message };
  }
  return { id: vocabularyId };
}

async function syncPosCitation(
  supabase: CorpusClient,
  ownerId: string,
  vocabularyId: string,
  partOfSpeech: string | null | undefined,
  pairArabic: string | null | undefined,
): Promise<WriteResult> {
  const slot = citationSlotForPos(partOfSpeech);
  const present =
    slot === "present_3ms" ? (pairArabic ?? null) : null;
  const plural = slot === "plural" ? (pairArabic ?? null) : null;
  const presentResult = await syncCitationForm(
    supabase,
    ownerId,
    vocabularyId,
    "present_3ms",
    present,
  );
  if ("error" in presentResult) return presentResult;
  return syncCitationForm(
    supabase,
    ownerId,
    vocabularyId,
    "plural",
    plural,
  );
}

export async function deleteVocabularyFormRecord(
  supabase: CorpusClient,
  formId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("vocabulary_forms")
    .delete()
    .eq("id", formId);
  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function writeVocabulary(
  supabase: CorpusClient,
  ownerId: string,
  input: VocabularyWriteInput,
  options?: { allowDuplicate?: boolean },
): Promise<WriteResult> {
  if (!options?.allowDuplicate) {
    const existing = await findExistingVocabulary(supabase, input.arabic);
    if (existing) {
      return {
        error: existingWordError(input.arabic, existing.arabic),
        existingId: existing.id,
      };
    }
  }

  const { data, error } = await supabase
    .from("vocabulary")
    .insert({
      owner_id: ownerId,
      arabic: input.arabic,
      transliteration: input.transliteration ?? null,
      part_of_speech: input.part_of_speech ?? null,
      notes: input.notes ?? null,
      root: input.root ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save vocabulary." };
  }

  const { error: senseError } = await supabase.from("vocabulary_senses").insert(
    input.senses.map((sense) => ({
      vocabulary_id: data.id,
      owner_id: ownerId,
      gloss: sense.gloss,
      lang: sense.lang,
    })),
  );
  if (senseError) {
    return { error: senseError.message };
  }

  const tagResult = await syncTags(
    supabase,
    ownerId,
    { kind: "vocabulary", entityId: data.id },
    input.tags,
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  const pairResult = await syncPosCitation(
    supabase,
    ownerId,
    data.id,
    input.part_of_speech,
    input.pairArabic,
  );
  if ("error" in pairResult) {
    return pairResult;
  }

  return { id: data.id };
}

export async function writeExample(
  supabase: CorpusClient,
  ownerId: string,
  input: ExampleWriteInput,
): Promise<WriteResult> {
  const { data, error } = await supabase
    .from("examples")
    .insert({
      owner_id: ownerId,
      arabic: input.arabic,
      translation: input.translation ?? null,
      transliteration: input.transliteration ?? null,
      notes: input.notes ?? null,
      text_id: input.textId ?? null,
      source_line: input.sourceLine ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save example." };
  }

  const joinResult = await syncExampleJoins(
    supabase,
    data.id,
    input.vocabularyIds ?? [],
    input.structureIds ?? [],
  );
  if (joinResult.error) {
    return { error: joinResult.error };
  }

  if (input.textId) {
    const seed = await seedTextVocabulary(
      supabase,
      input.textId,
      input.vocabularyIds ?? [],
    );
    if (seed.error) {
      return { error: seed.error };
    }
  }

  const tagResult = await syncTags(
    supabase,
    ownerId,
    { kind: "example", entityId: data.id },
    input.tags,
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  return { id: data.id };
}

export async function writeStructure(
  supabase: CorpusClient,
  ownerId: string,
  input: StructureWriteInput,
): Promise<WriteResult> {
  const { data, error } = await supabase
    .from("structures")
    .insert({
      owner_id: ownerId,
      name: input.name,
      arabic_form: input.arabic_form ?? null,
      transliteration: input.transliteration ?? null,
      meaning: input.meaning ?? null,
      explanation: input.explanation ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save structure." };
  }

  const linkResult = await syncStructureExampleLinks(
    supabase,
    data.id,
    input.exampleIds ?? [],
  );
  if (linkResult.error) {
    return { error: linkResult.error };
  }

  const tagResult = await syncTags(
    supabase,
    ownerId,
    { kind: "structure", entityId: data.id },
    input.tags,
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  return { id: data.id };
}

export async function writeText(
  supabase: CorpusClient,
  ownerId: string,
  input: TextWriteInput,
): Promise<WriteResult> {
  const { data, error } = await supabase
    .from("texts")
    .insert({
      owner_id: ownerId,
      title: input.title,
      arabic: input.arabic,
      translation: input.translation ?? null,
      source: input.source ?? null,
      occurred_on: input.occurred_on ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save text." };
  }

  const tagResult = await syncTags(
    supabase,
    ownerId,
    { kind: "text", entityId: data.id },
    input.tags,
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  return { id: data.id };
}

export type EnrichResult =
  | { id: string; enriched: boolean }
  | WriteErr;

/**
 * Fill absent fields on an existing vocabulary row from an import.
 * Does not overwrite non-empty scalars or citation forms.
 */
export async function enrichVocabularyRecord(
  supabase: CorpusClient,
  ownerId: string,
  existing: ExistingVocabularyState,
  input: VocabularyWriteInput,
): Promise<EnrichResult> {
  const plan = planVocabEnrich(existing, input);
  if (!plan.hasChanges) {
    return { id: existing.id, enriched: false };
  }

  const { patch } = plan;
  const updates: {
    transliteration?: string;
    part_of_speech?: string;
    notes?: string;
    root?: string;
  } = {};
  if (patch.transliteration !== undefined) {
    updates.transliteration = patch.transliteration;
  }
  if (patch.part_of_speech !== undefined) {
    updates.part_of_speech = patch.part_of_speech;
  }
  if (patch.notes !== undefined) {
    updates.notes = patch.notes;
  }
  if (patch.root !== undefined) {
    updates.root = patch.root;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("vocabulary")
      .update(updates)
      .eq("id", existing.id);
    if (error) {
      return { error: error.message };
    }
  }

  if (patch.sensesToAdd.length > 0) {
    const { error: senseError } = await supabase
      .from("vocabulary_senses")
      .insert(
        patch.sensesToAdd.map((sense) => ({
          vocabulary_id: existing.id,
          owner_id: ownerId,
          gloss: sense.gloss,
          lang: sense.lang,
        })),
      );
    if (senseError) {
      return { error: senseError.message };
    }
  }

  if (patch.tags.length !== existing.tags.length) {
    const tagResult = await syncTags(
      supabase,
      ownerId,
      { kind: "vocabulary", entityId: existing.id },
      patch.tags,
    );
    if (tagResult.error) {
      return { error: tagResult.error };
    }
  }

  if (patch.pairSlot && patch.pairArabic) {
    const pairResult = await syncCitationForm(
      supabase,
      ownerId,
      existing.id,
      patch.pairSlot,
      patch.pairArabic,
    );
    if ("error" in pairResult) {
      return { error: pairResult.error };
    }
  }

  return { id: existing.id, enriched: true };
}

export async function updateVocabularyRecord(
  supabase: CorpusClient,
  ownerId: string,
  id: string,
  input: VocabularyWriteInput,
): Promise<WriteResult> {
  const { error } = await supabase
    .from("vocabulary")
    .update({
      arabic: input.arabic,
      transliteration: input.transliteration ?? null,
      part_of_speech: input.part_of_speech ?? null,
      notes: input.notes ?? null,
      root: input.root ?? null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const { error: deleteSensesError } = await supabase
    .from("vocabulary_senses")
    .delete()
    .eq("vocabulary_id", id);
  if (deleteSensesError) {
    return { error: deleteSensesError.message };
  }

  const { error: senseError } = await supabase.from("vocabulary_senses").insert(
    input.senses.map((sense) => ({
      vocabulary_id: id,
      owner_id: ownerId,
      gloss: sense.gloss,
      lang: sense.lang,
    })),
  );
  if (senseError) {
    return { error: senseError.message };
  }

  const tagResult = await syncTags(
    supabase,
    ownerId,
    { kind: "vocabulary", entityId: id },
    input.tags,
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  const pairResult = await syncPosCitation(
    supabase,
    ownerId,
    id,
    input.part_of_speech,
    input.pairArabic,
  );
  if ("error" in pairResult) {
    return pairResult;
  }

  return { id };
}

export async function updateExampleRecord(
  supabase: CorpusClient,
  ownerId: string,
  id: string,
  input: ExampleWriteInput,
): Promise<WriteResult> {
  const { error } = await supabase
    .from("examples")
    .update({
      arabic: input.arabic,
      translation: input.translation ?? null,
      transliteration: input.transliteration ?? null,
      notes: input.notes ?? null,
      text_id: input.textId ?? null,
      source_line: input.sourceLine ?? null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const joinResult = await syncExampleJoins(
    supabase,
    id,
    input.vocabularyIds ?? [],
    input.structureIds ?? [],
  );
  if (joinResult.error) {
    return { error: joinResult.error };
  }

  if (input.textId) {
    const seed = await seedTextVocabulary(
      supabase,
      input.textId,
      input.vocabularyIds ?? [],
    );
    if (seed.error) {
      return { error: seed.error };
    }
  }

  const tagResult = await syncTags(
    supabase,
    ownerId,
    { kind: "example", entityId: id },
    input.tags,
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  return { id };
}

export async function updateStructureRecord(
  supabase: CorpusClient,
  ownerId: string,
  id: string,
  input: StructureWriteInput,
): Promise<WriteResult> {
  const { error } = await supabase
    .from("structures")
    .update({
      name: input.name,
      arabic_form: input.arabic_form ?? null,
      transliteration: input.transliteration ?? null,
      meaning: input.meaning ?? null,
      explanation: input.explanation ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const linkResult = await syncStructureExampleLinks(
    supabase,
    id,
    input.exampleIds ?? [],
  );
  if (linkResult.error) {
    return { error: linkResult.error };
  }

  const tagResult = await syncTags(
    supabase,
    ownerId,
    { kind: "structure", entityId: id },
    input.tags,
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  return { id };
}

export async function updateTextRecord(
  supabase: CorpusClient,
  ownerId: string,
  id: string,
  input: TextWriteInput,
): Promise<WriteResult> {
  const { error } = await supabase
    .from("texts")
    .update({
      title: input.title,
      arabic: input.arabic,
      translation: input.translation ?? null,
      source: input.source ?? null,
      occurred_on: input.occurred_on ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const tagResult = await syncTags(
    supabase,
    ownerId,
    { kind: "text", entityId: id },
    input.tags,
  );
  if (tagResult.error) {
    return { error: tagResult.error };
  }

  return { id };
}

export async function syncExampleJoins(
  supabase: CorpusClient,
  exampleId: string,
  vocabularyIds: string[],
  structureIds: string[],
): Promise<{ error?: string }> {
  const { error: deleteVocabError } = await supabase
    .from("example_vocabulary")
    .delete()
    .eq("example_id", exampleId);
  if (deleteVocabError) {
    return { error: deleteVocabError.message };
  }

  const { error: deleteStructError } = await supabase
    .from("example_structures")
    .delete()
    .eq("example_id", exampleId);
  if (deleteStructError) {
    return { error: deleteStructError.message };
  }

  if (vocabularyIds.length > 0) {
    const { error } = await supabase.from("example_vocabulary").insert(
      vocabularyIds.map((vocabularyId) => ({
        example_id: exampleId,
        vocabulary_id: vocabularyId,
      })),
    );
    if (error) {
      return { error: error.message };
    }
  }

  if (structureIds.length > 0) {
    const { error } = await supabase.from("example_structures").insert(
      structureIds.map((structureId) => ({
        example_id: exampleId,
        structure_id: structureId,
      })),
    );
    if (error) {
      return { error: error.message };
    }
  }

  return {};
}

export async function attachExampleStructures(
  supabase: CorpusClient,
  exampleId: string,
  structureIds: string[],
): Promise<{ error?: string }> {
  const unique = [...new Set(structureIds.filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }

  const { error } = await supabase.from("example_structures").upsert(
    unique.map((structureId) => ({
      example_id: exampleId,
      structure_id: structureId,
    })),
    { onConflict: "example_id,structure_id", ignoreDuplicates: true },
  );
  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function syncStructureExampleLinks(
  supabase: CorpusClient,
  structureId: string,
  exampleIds: string[],
): Promise<{ error?: string }> {
  const { error: deleteError } = await supabase
    .from("example_structures")
    .delete()
    .eq("structure_id", structureId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (exampleIds.length === 0) {
    return {};
  }

  const { error: insertError } = await supabase.from("example_structures").insert(
    exampleIds.map((exampleId) => ({
      example_id: exampleId,
      structure_id: structureId,
    })),
  );

  if (insertError) {
    return { error: insertError.message };
  }

  return {};
}

export type PatternWriteInput = {
  name: string;
  arabic_sketch?: string | null;
  form_label?: string | null;
  meaning_shift?: string | null;
  cue?: string | null;
  notes?: string | null;
  mastery_state?: string;
};

export async function writePattern(
  supabase: CorpusClient,
  ownerId: string,
  input: PatternWriteInput,
): Promise<WriteResult> {
  const { data, error } = await supabase
    .from("morph_patterns")
    .insert({
      owner_id: ownerId,
      name: input.name,
      arabic_sketch: input.arabic_sketch ?? null,
      form_label: input.form_label ?? null,
      meaning_shift: input.meaning_shift ?? null,
      cue: input.cue ?? null,
      notes: input.notes ?? null,
      mastery_state: input.mastery_state ?? "encountered",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not save pattern." };
  }

  return { id: data.id };
}

export async function updatePatternRecord(
  supabase: CorpusClient,
  id: string,
  input: PatternWriteInput,
): Promise<WriteResult> {
  const { error } = await supabase
    .from("morph_patterns")
    .update({
      name: input.name,
      arabic_sketch: input.arabic_sketch ?? null,
      form_label: input.form_label ?? null,
      meaning_shift: input.meaning_shift ?? null,
      cue: input.cue ?? null,
      notes: input.notes ?? null,
      mastery_state: input.mastery_state ?? "encountered",
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { id };
}

export async function linkPatternVocabulary(
  supabase: CorpusClient,
  patternId: string,
  vocabularyId: string,
  role: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("pattern_vocabulary").upsert(
    {
      pattern_id: patternId,
      vocabulary_id: vocabularyId,
      role,
    },
    { onConflict: "pattern_id,vocabulary_id" },
  );

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function unlinkPatternVocabulary(
  supabase: CorpusClient,
  patternId: string,
  vocabularyId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("pattern_vocabulary")
    .delete()
    .eq("pattern_id", patternId)
    .eq("vocabulary_id", vocabularyId);

  if (error) {
    return { error: error.message };
  }

  return {};
}
