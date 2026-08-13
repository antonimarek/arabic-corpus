import { VocabularyForm } from "@/app/(app)/vocabulary/vocabulary-form";

type NewVocabularyProps = {
  searchParams: Promise<{ arabic?: string }>;
};

export default async function NewVocabularyPage({
  searchParams,
}: NewVocabularyProps) {
  const params = await searchParams;
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">New vocabulary</h1>
      <VocabularyForm mode="create" defaultArabic={params.arabic} />
    </section>
  );
}
