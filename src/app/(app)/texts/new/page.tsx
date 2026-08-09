import { TextForm } from "@/app/(app)/texts/text-form";

export default function NewTextPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-medium text-[var(--ink)]">New text</h1>
      <TextForm mode="create" />
    </section>
  );
}
