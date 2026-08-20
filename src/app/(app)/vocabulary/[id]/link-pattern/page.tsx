import Link from "next/link";
import { notFound } from "next/navigation";

import { linkPatternFromVocabulary } from "@/app/(app)/patterns/actions";
import {
  PATTERN_ROLE_LABEL,
  PATTERN_ROLES,
} from "@/lib/patterns";
import { createClient } from "@/lib/supabase/server";

type LinkPatternPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LinkPatternPage({
  params,
}: LinkPatternPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: vocabulary }, { data: patterns }] = await Promise.all([
    supabase
      .from("vocabulary")
      .select("id, arabic, pattern_vocabulary(pattern_id)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("morph_patterns")
      .select("id, name, arabic_sketch")
      .order("updated_at", { ascending: false }),
  ]);

  if (!vocabulary) {
    notFound();
  }

  const linkedIds = new Set(
    (vocabulary.pattern_vocabulary ?? []).map((row) => row.pattern_id),
  );
  const options = (patterns ?? []).filter((row) => !linkedIds.has(row.id));

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-medium text-[var(--ink)]">
          Link to pattern
        </h1>
        <p className="text-sm text-[var(--ink-muted)]">
          Word:{" "}
          <span className="font-arabic text-[var(--ink)]" lang="ar" dir="rtl">
            {vocabulary.arabic}
          </span>
        </p>
      </div>

      {options.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          No other patterns to join.{" "}
          <Link
            href={`/patterns/new?vocabulary=${vocabulary.id}`}
            className="text-[var(--accent)] hover:underline"
          >
            Create a pattern
          </Link>{" "}
          from this word.
        </p>
      ) : (
        <form
          action={linkPatternFromVocabulary.bind(null, vocabulary.id)}
          className="flex flex-col gap-5"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Pattern</span>
            <select
              name="pattern_id"
              required
              defaultValue=""
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            >
              <option value="" disabled>
                Pick a pattern…
              </option>
              {options.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                  {row.arabic_sketch ? ` (${row.arabic_sketch})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Role</span>
            <select
              name="role"
              defaultValue="related"
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--accent)]"
            >
              {PATTERN_ROLES.map((role) => (
                <option key={role} value={role}>
                  {PATTERN_ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="self-start rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm text-white"
          >
            Link
          </button>
        </form>
      )}

      <Link
        href={`/vocabulary/${vocabulary.id}`}
        className="text-sm text-[var(--ink-muted)] hover:underline"
      >
        Back to word
      </Link>
    </section>
  );
}
