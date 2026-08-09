import { notFound } from "next/navigation";

import { TextForm } from "@/app/(app)/texts/text-form";
import { createClient } from "@/lib/supabase/server";
import { tagsToInput } from "@/lib/tags";

type EditTextPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTextPage({ params }: EditTextPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: text } = await supabase
    .from("texts")
    .select("*, text_tags(tags(name))")
    .eq("id", id)
    .maybeSingle();

  if (!text) {
    notFound();
  }

  const tags =
    text.text_tags?.map((row) => row.tags).filter(Boolean) ?? [];

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">Edit text</h1>
      <TextForm mode="edit" text={text} tagsInput={tagsToInput(tags)} />
    </section>
  );
}
