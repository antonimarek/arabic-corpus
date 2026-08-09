import Link from "next/link";

import { TypePill } from "@/components/type-pill";
import { hrefForHit, type SearchHit } from "@/lib/search";

export function SearchResults({ hits }: { hits: SearchHit[] }) {
  return (
    <ul className="flex flex-col divide-y divide-[var(--line)]">
      {hits.map((hit) => (
        <li key={`${hit.type}:${hit.id}`}>
          <Link
            href={hrefForHit(hit)}
            className="flex flex-col gap-2 py-4 hover:opacity-80"
          >
            <div className="flex flex-wrap items-center gap-2">
              <TypePill type={hit.type} />
              {hit.matchLabel ? (
                <span className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                  {hit.matchLabel}
                </span>
              ) : null}
            </div>

            {hit.type === "text" || hit.type === "structure" ? (
              <span className="text-[15px] font-medium text-[var(--ink)]">
                {hit.title}
              </span>
            ) : null}

            {hit.arabic ? (
              <span
                className="font-arabic line-clamp-3 text-xl leading-relaxed text-[var(--ink)]"
                lang="ar"
                dir="rtl"
              >
                {hit.arabic}
              </span>
            ) : hit.type === "structure" ? (
              <span className="text-[15px] text-[var(--ink)]">{hit.title}</span>
            ) : null}

            {hit.subtitle ? (
              <span className="line-clamp-2 text-sm leading-relaxed text-[var(--ink-muted)]">
                {hit.subtitle}
              </span>
            ) : null}

            {hit.context && hit.context.length > 0 ? (
              <span className="text-xs text-[var(--ink-muted)]">
                {hit.context.join(" · ")}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
