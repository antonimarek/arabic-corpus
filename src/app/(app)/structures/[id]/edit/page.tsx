import { notFound } from "next/navigation";

import { StructureForm } from "@/app/(app)/structures/structure-form";
import { createClient } from "@/lib/supabase/server";
import { tagsToInput } from "@/lib/tags";

type EditStructureProps = {
  params: Promise<{ id: string }>;
};

export default async function EditStructurePage({
  params,
}: EditStructureProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data }, { data: examples }] = await Promise.all([
    supabase
      .from("structures")
      .select(
        "*, structure_tags(tags(name)), example_structures(example_id)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("examples")
      .select("id, arabic, translation")
      .order("created_at", { ascending: false }),
  ]);

  if (!data) {
    notFound();
  }

  const tags =
    data.structure_tags?.map((row) => row.tags).filter(Boolean) ?? [];

  const selectedExampleIds =
    data.example_structures?.map((row) => row.example_id) ?? [];

  const exampleOptions =
    examples?.map((example) => ({
      id: example.id,
      label: example.arabic,
      hint: example.translation,
    })) ?? [];

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">Edit structure</h1>
      <StructureForm
        mode="edit"
        structure={data}
        exampleOptions={exampleOptions}
        selectedExampleIds={selectedExampleIds}
        tagsInput={tagsToInput(tags)}
      />
    </section>
  );
}
