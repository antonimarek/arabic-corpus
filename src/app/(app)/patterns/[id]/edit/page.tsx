import { notFound } from "next/navigation";

import { PatternForm } from "@/app/(app)/patterns/pattern-form";
import { createClient } from "@/lib/supabase/server";

type EditPatternProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPatternPage({ params }: EditPatternProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("morph_patterns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">Edit pattern</h1>
      <PatternForm mode="edit" pattern={data} />
    </section>
  );
}
