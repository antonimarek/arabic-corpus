import type { SupabaseClient } from "@supabase/supabase-js";

import { phraseSearchKey } from "@/lib/lookup-phrase";
import { syncTags } from "@/lib/tags";
import type { Database } from "@/types/database";

export type CorpusClient = SupabaseClient<Database>;

export type VocabularyWriteInput = {
  arabic: string;
  transliteration?: string | null;
  part_of_speech?: string | null;
  notes?: string | null;
  root?: string | null;
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
): Promise<string | null> {
  const searchKey = phraseSearchKey(arabic);
  if (!searchKey) return null;
  const { data } = await supabase
    .from("vocabulary")
    .select("id")
    .eq("search_arabic", searchKey)
    .limit(1)
    .maybeSingle();
  if (data?.id) return data.id;

  const { data: form } = await supabase
    .from("vocabulary_forms")
    .select("vocabulary_id")
    .eq("search_arabic", searchKey)
    .limit(1)
    .maybeSingle();
  return form?.vocabulary_id ?? null;
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
): Promise<WriteResult> {
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

  const existingId = await findExistingVocabulary(supabase, arabic);
  if (existingId && existingId !== vocabularyId) {
    return {
      error: "This form already belongs to another word.",
      existingId,
    };
  }
  if (existingId === vocabularyId) {
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
    const existingId = await findExistingVocabulary(supabase, input.arabic);
    if (existingId) {
      return {
        error:
          "This word is already in the corpus. Open the existing card to add a sense.",
        existingId,
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
