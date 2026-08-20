import { PatternForm } from "@/app/(app)/patterns/pattern-form";
import { createClient } from "@/lib/supabase/server";
import { isPatternRole, type PatternRole } from "@/lib/patterns";

type NewPatternPageProps = {
  searchParams: Promise<{ vocabulary?: string; role?: string }>;
};

export default async function NewPatternPage({
  searchParams,
}: NewPatternPageProps) {
  const params = await searchParams;
  const vocabularyId = params.vocabulary?.trim() || undefined;
  let seedArabic: string | undefined;
  let seedRole: PatternRole | undefined;

  if (vocabularyId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vocabulary")
      .select("id, arabic")
      .eq("id", vocabularyId)
      .maybeSingle();
    if (data) {
      seedArabic = data.arabic;
    }
    if (params.role && isPatternRole(params.role)) {
      seedRole = params.role;
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">New pattern</h1>
      <p className="text-sm text-[var(--ink-muted)]">
        Name the operation, not a grammar chapter. Link words you already know.
      </p>
      <PatternForm
        mode="create"
        seedVocabularyId={vocabularyId}
        seedArabic={seedArabic}
        seedRole={seedRole}
      />
    </section>
  );
}
