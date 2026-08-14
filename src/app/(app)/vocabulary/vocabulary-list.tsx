"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import type { PosKind } from "@/lib/citation";
import {
  filterVocabularyRows,
  parsePosKindParam,
  parseSortParam,
  presentPosKinds,
  sortVocabularyRows,
  vocabularyEmptyMessage,
  vocabularyRowSubtitle,
  type VocabSort,
  type VocabularyListRow,
} from "@/lib/vocabulary-list";

const KIND_LABEL: Record<PosKind, string> = {
  verb: "Verb",
  noun: "Noun",
  other: "Other",
};

function chipClass(active: boolean): string {
  return `rounded-md px-2.5 py-1.5 text-xs ${
    active
      ? "bg-[var(--accent)] text-white"
      : "border border-[var(--line)] text-[var(--ink-muted)]"
  }`;
}

export function VocabularyList({ rows }: { rows: VocabularyListRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const kind = parsePosKindParam(searchParams.get("kind"));
  const tagParam = searchParams.get("tag");
  const tag = tagParam ? tagParam : null;
  const sort = parseSortParam(searchParams.get("sort"));

  const kinds = useMemo(() => presentPosKinds(rows), [rows]);
  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      for (const name of row.tags) {
        if (name) set.add(name);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const replaceParams = useCallback(
    (patch: { kind?: PosKind | null; tag?: string | null; sort?: VocabSort }) => {
      const params = new URLSearchParams(searchParams.toString());
      if ("kind" in patch) {
        if (patch.kind) params.set("kind", patch.kind);
        else params.delete("kind");
      }
      if ("tag" in patch) {
        if (patch.tag) params.set("tag", patch.tag);
        else params.delete("tag");
      }
      if ("sort" in patch) {
        if (patch.sort === "oldest") params.set("sort", "oldest");
        else params.delete("sort");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const visible = useMemo(
    () => sortVocabularyRows(filterVocabularyRows(rows, kind, tag), sort),
    [kind, rows, sort, tag],
  );

  return (
    <div className="flex flex-col gap-4">
      {kinds.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => replaceParams({ kind: null })}
            className={chipClass(kind == null)}
          >
            All
          </button>
          {kinds.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                replaceParams({ kind: kind === value ? null : value })
              }
              className={chipClass(kind === value)}
            >
              {KIND_LABEL[value]}
            </button>
          ))}
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => replaceParams({ tag: null })}
            className={chipClass(tag == null)}
          >
            All
          </button>
          {tags.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => replaceParams({ tag: tag === name ? null : name })}
              className={chipClass(tag === name)}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex gap-3 text-sm">
        <button
          type="button"
          onClick={() => replaceParams({ sort: "newest" })}
          className={
            sort === "newest"
              ? "text-[var(--ink)]"
              : "text-[var(--ink-muted)]"
          }
        >
          Newest
        </button>
        <button
          type="button"
          onClick={() => replaceParams({ sort: "oldest" })}
          className={
            sort === "oldest"
              ? "text-[var(--ink)]"
              : "text-[var(--ink-muted)]"
          }
        >
          Oldest
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="text-[15px] text-[var(--ink-muted)]">
          {vocabularyEmptyMessage(kind, tag)}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--line)]">
          {visible.map((row) => {
            const subtitle = vocabularyRowSubtitle(row, kind != null);
            return (
              <li key={row.id}>
                <Link
                  href={row.href}
                  className="flex flex-col gap-1.5 py-4 hover:opacity-80"
                >
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
                  {subtitle ? (
                    <span className="text-[15px] text-[var(--ink-muted)]">
                      {subtitle}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
