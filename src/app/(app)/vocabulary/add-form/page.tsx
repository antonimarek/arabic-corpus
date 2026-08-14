import Link from "next/link";

import { AddFormPicker } from "@/app/(app)/vocabulary/add-form/add-form-picker";
import { firstGloss } from "@/lib/arabic-links";
import { formHostHint, rankFormHosts } from "@/lib/form-suggest";
import { createClient } from "@/lib/supabase/server";

type AddFormPageProps = {
  searchParams: Promise<{ arabic?: string }>;
};

export default async function AddVocabularyFormPage({
  searchParams,
}: AddFormPageProps) {
  const params = await searchParams;
  const arabic = params.arabic?.trim() ?? "";
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("vocabulary")
    .select(
      "id, arabic, transliteration, root, part_of_speech, vocabulary_senses(gloss, created_at)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        Could not load vocabulary: {error.message}
      </p>
    );
  }

  const ranked = rankFormHosts(
    arabic,
    (rows ?? []).map((row) => ({
      id: row.id,
      arabic: row.arabic,
      root: row.root,
      part_of_speech: row.part_of_speech,
      gloss: firstGloss(row.vocabulary_senses),
    })),
  );

  const byId = new Map((rows ?? []).map((row) => [row.id, row]));
  const options = ranked.map((host) => {
    const row = byId.get(host.id);
    const rootHint = arabic ? formHostHint(arabic, host) : null;
    return {
      id: host.id,
      arabic: host.arabic,
      hint: [
        rootHint,
        row?.transliteration,
        host.gloss,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  });

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-medium text-[var(--ink)]">
          Add form to existing
        </h1>
        {arabic ? (
          <p className="text-sm text-[var(--ink-muted)]">
            Attach{" "}
            <span
              className="font-arabic text-lg text-[var(--ink)]"
              lang="ar"
              dir="rtl"
            >
              {arabic}
            </span>{" "}
            as a surface form of a word you already have. Same-root verbs
            (including alef drop) sit at the top.
          </p>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">
            Select Arabic in a text first, then choose Add form to existing.
          </p>
        )}
      </div>

      {!arabic ? null : options.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          No vocabulary yet.{" "}
          <Link
            href={`/vocabulary/new?arabic=${encodeURIComponent(arabic)}`}
            className="text-[var(--accent)] hover:underline"
          >
            Add this as a new word
          </Link>
          .
        </p>
      ) : (
        <AddFormPicker arabic={arabic} options={options} />
      )}
    </section>
  );
}
