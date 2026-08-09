import { StructureForm } from "@/app/(app)/structures/structure-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewStructurePage() {
  const supabase = await createClient();
  const { data: examples } = await supabase
    .from("examples")
    .select("id, arabic, translation")
    .order("created_at", { ascending: false });

  const exampleOptions =
    examples?.map((example) => ({
      id: example.id,
      label: example.arabic,
      hint: example.translation,
    })) ?? [];

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">New structure</h1>
      <StructureForm mode="create" exampleOptions={exampleOptions} />
    </section>
  );
}
