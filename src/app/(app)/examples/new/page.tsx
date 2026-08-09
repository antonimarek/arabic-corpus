import { ExampleForm } from "@/app/(app)/examples/example-form";
import { createClient } from "@/lib/supabase/server";

type NewExampleProps = {
  searchParams: Promise<{
    vocabulary?: string;
    structure?: string;
    text?: string;
  }>;
};

export default async function NewExamplePage({ searchParams }: NewExampleProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: texts }, { data: vocabulary }, { data: structures }] =
    await Promise.all([
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

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">New example</h1>
      <ExampleForm
        mode="create"
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
        defaultTextId={params.text}
        defaultVocabularyIds={params.vocabulary ? [params.vocabulary] : []}
        defaultStructureIds={params.structure ? [params.structure] : []}
      />
    </section>
  );
}
