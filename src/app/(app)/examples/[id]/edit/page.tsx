import { notFound } from "next/navigation";

import { ExampleForm } from "@/app/(app)/examples/example-form";
import { createClient } from "@/lib/supabase/server";
import { tagsToInput } from "@/lib/tags";

type EditExampleProps = {
  params: Promise<{ id: string }>;
};

export default async function EditExamplePage({ params }: EditExampleProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data },
    { data: textRows },
    { data: vocabulary },
    { data: structures },
  ] = await Promise.all([
    supabase
      .from("examples")
      .select(
        "*, example_tags(tags(name)), example_vocabulary(vocabulary_id), example_structures(structure_id)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("texts")
      .select("id, title")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("vocabulary")
      .select("id, arabic, transliteration")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("structures")
      .select("id, name, arabic_form")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (!data) {
    notFound();
  }

  const selectedVocabularyIds =
    data.example_vocabulary?.map((row) => row.vocabulary_id) ?? [];
  const selectedStructureIds =
    data.example_structures?.map((row) => row.structure_id) ?? [];

  let texts = textRows ?? [];
  if (data.text_id && !texts.some((text) => text.id === data.text_id)) {
    const { data: linkedText } = await supabase
      .from("texts")
      .select("id, title")
      .eq("id", data.text_id)
      .maybeSingle();
    if (linkedText) {
      texts = [linkedText, ...texts];
    }
  }

  const vocabMap = new Map(
    (vocabulary ?? []).map((row) => [
      row.id,
      { id: row.id, label: row.arabic, hint: row.transliteration },
    ]),
  );
  const missingVocabIds = selectedVocabularyIds.filter((vid) => !vocabMap.has(vid));
  if (missingVocabIds.length > 0) {
    const { data: extraVocab } = await supabase
      .from("vocabulary")
      .select("id, arabic, transliteration")
      .in("id", missingVocabIds);
    for (const row of extraVocab ?? []) {
      vocabMap.set(row.id, {
        id: row.id,
        label: row.arabic,
        hint: row.transliteration,
      });
    }
  }

  const structureMap = new Map(
    (structures ?? []).map((row) => [
      row.id,
      { id: row.id, label: row.name, hint: row.arabic_form },
    ]),
  );
  const missingStructureIds = selectedStructureIds.filter(
    (sid) => !structureMap.has(sid),
  );
  if (missingStructureIds.length > 0) {
    const { data: extraStructures } = await supabase
      .from("structures")
      .select("id, name, arabic_form")
      .in("id", missingStructureIds);
    for (const row of extraStructures ?? []) {
      structureMap.set(row.id, {
        id: row.id,
        label: row.name,
        hint: row.arabic_form,
      });
    }
  }

  const tags =
    data.example_tags
      ?.map((row) => row.tags)
      .filter(Boolean) ?? [];

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">Edit example</h1>
      <ExampleForm
        mode="edit"
        example={data}
        textOptions={texts.map((text) => ({ id: text.id, label: text.title }))}
        vocabularyOptions={[...vocabMap.values()]}
        structureOptions={[...structureMap.values()]}
        selectedVocabularyIds={selectedVocabularyIds}
        selectedStructureIds={selectedStructureIds}
        tagsInput={tagsToInput(tags)}
      />
    </section>
  );
}
