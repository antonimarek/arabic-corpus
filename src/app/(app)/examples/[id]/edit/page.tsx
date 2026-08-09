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
    { data: texts },
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
      .order("created_at", { ascending: false }),
    supabase
      .from("vocabulary")
      .select("id, arabic, transliteration")
      .order("created_at", { ascending: false }),
    supabase
      .from("structures")
      .select("id, name, arabic_form")
      .order("created_at", { ascending: false }),
  ]);

  if (!data) {
    notFound();
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
        textOptions={
          texts?.map((text) => ({ id: text.id, label: text.title })) ?? []
        }
        vocabularyOptions={
          vocabulary?.map((row) => ({
            id: row.id,
            label: row.arabic,
            hint: row.transliteration,
          })) ?? []
        }
        structureOptions={
          structures?.map((row) => ({
            id: row.id,
            label: row.name,
            hint: row.arabic_form,
          })) ?? []
        }
        selectedVocabularyIds={
          data.example_vocabulary?.map((row) => row.vocabulary_id) ?? []
        }
        selectedStructureIds={
          data.example_structures?.map((row) => row.structure_id) ?? []
        }
        tagsInput={tagsToInput(tags)}
      />
    </section>
  );
}
