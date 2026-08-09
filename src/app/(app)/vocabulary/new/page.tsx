import { VocabularyForm } from "@/app/(app)/vocabulary/vocabulary-form";

export default function NewVocabularyPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">New vocabulary</h1>
      <VocabularyForm mode="create" />
    </section>
  );
}
