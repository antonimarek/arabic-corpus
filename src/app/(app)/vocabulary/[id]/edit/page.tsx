import { notFound } from "next/navigation";

import { VocabularyForm } from "@/app/(app)/vocabulary/vocabulary-form";
import { citationArabic, citationSlotForPos } from "@/lib/citation";
import { createClient } from "@/lib/supabase/server";
import { tagsToInput } from "@/lib/tags";

type EditVocabularyProps = {
  params: Promise<{ id: string }>;
};

export default async function EditVocabularyPage({
  params,
}: EditVocabularyProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("vocabulary")
    .select("*, vocabulary_senses(*), vocabulary_forms(id, arabic, slot), vocabulary_tags(tags(name))")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const tags =
    data.vocabulary_tags?.map((row) => row.tags).filter(Boolean) ?? [];
  const slot = citationSlotForPos(data.part_of_speech);
  const pairArabic = slot
    ? citationArabic(data.vocabulary_forms, slot)
    : null;

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">Edit vocabulary</h1>
      <VocabularyForm
        mode="edit"
        vocabulary={data}
        senses={data.vocabulary_senses ?? []}
        tagsInput={tagsToInput(tags)}
        pairArabic={pairArabic}
      />
    </section>
  );
}
