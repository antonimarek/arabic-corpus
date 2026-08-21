"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type EntityListRow = {
  id: string;
  href: string;
  tags: string[];
  title?: string;
  arabic?: string | null;
  arabicPair?: string | null;
  subtitle?: string | null;
};

export function FilteredEntityList({ rows }: { rows: EntityListRow[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      for (const tag of row.tags) {
        if (tag) set.add(tag);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const visible = activeTag
    ? rows.filter((row) => row.tags.includes(activeTag))
    : rows;

  return (
    <div className="flex flex-col gap-4">
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className="ui-chip"
            data-active={activeTag == null}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() =>
                setActiveTag((current) => (current === tag ? null : tag))
              }
              className="ui-chip"
              data-active={activeTag === tag}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          No rows with this tag.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((row) => (
            <li key={row.id}>
              <Link href={row.href} className="ui-row">
                {row.title ? (
                  <span className="text-[15px] font-medium text-[var(--ink)]">
                    {row.title}
                  </span>
                ) : null}
                {row.arabic ? (
                  <span
                    className="font-arabic line-clamp-2 text-lg leading-relaxed text-[var(--ink)]"
                    lang="ar"
                    dir="rtl"
                  >
                    {row.arabic}
                    {row.arabicPair ? (
                      <span className="text-[var(--ink-muted)]">
                        {" "}
                        · {row.arabicPair}
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {row.subtitle ? (
                  <span className="text-[15px] text-[var(--ink-muted)]">
                    {row.subtitle}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
