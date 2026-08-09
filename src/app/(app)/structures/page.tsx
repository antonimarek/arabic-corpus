import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function StructuresPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("structures")
    .select(
      "id, name, arabic_form, meaning, created_at, example_structures(example_id)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        Could not load structures: {error.message}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-medium text-[var(--ink)]">Structures</h1>
        <Link
          href="/structures/new"
          className="text-sm text-[var(--accent)] hover:underline"
        >
          New structure
        </Link>
      </div>

      {!rows || rows.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          No structures yet. Capture a chunk, pattern, or idiom you keep meeting.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--line)]">
          {rows.map((row) => {
            const count = row.example_structures?.length ?? 0;
            return (
              <li key={row.id}>
                <Link
                  href={`/structures/${row.id}`}
                  className="flex flex-col gap-1.5 py-4 hover:opacity-80"
                >
                  <span className="text-[15px] font-medium text-[var(--ink)]">
                    {row.name}
                  </span>
                  {row.arabic_form ? (
                    <span
                      className="font-arabic text-lg text-[var(--ink)]"
                      lang="ar"
                      dir="rtl"
                    >
                      {row.arabic_form}
                    </span>
                  ) : null}
                  <span className="text-xs text-[var(--ink-muted)]">
                    {[row.meaning, `${count} example${count === 1 ? "" : "s"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
