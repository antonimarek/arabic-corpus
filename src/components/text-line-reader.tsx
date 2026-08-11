"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  renderLinkedArabic,
  type ArabicLink,
} from "@/lib/highlight-arabic";
import {
  LINE_FILTER_MIN_LINES,
  lineAnchorId,
  lineHref,
  parseLineHash,
  shouldOfferSentenceSplit,
  splitTextLines,
} from "@/lib/text-lines";

export type LineExampleRef = {
  id: string;
  arabic: string;
  sourceLine: number | null;
};

type TextLineReaderProps = {
  textId: string;
  arabic: string;
  translation?: string | null;
  links?: ArabicLink[];
  examples?: LineExampleRef[];
  defaultShowTranslation?: boolean;
};

export function TextLineReader({
  textId,
  arabic,
  translation,
  links = [],
  examples = [],
  defaultShowTranslation = true,
}: TextLineReaderProps) {
  const lines = useMemo(() => splitTextLines(arabic), [arabic]);
  const nonEmptyLineCount = useMemo(
    () => lines.filter((line) => line.trim().length > 0).length,
    [lines],
  );
  const showLineFilter = nonEmptyLineCount >= LINE_FILTER_MIN_LINES;
  const offerSentenceSplit = useMemo(
    () => shouldOfferSentenceSplit(arabic),
    [arabic],
  );
  const hasTranslation = Boolean(translation?.trim());
  const [showTranslation, setShowTranslation] = useState(
    hasTranslation && defaultShowTranslation,
  );
  const [query, setQuery] = useState("");
  const [flashLine, setFlashLine] = useState<number | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const scrollRestored = useRef(false);

  const examplesByLine = useMemo(() => {
    const map = new Map<number, LineExampleRef[]>();
    for (const example of examples) {
      if (example.sourceLine == null) continue;
      const list = map.get(example.sourceLine) ?? [];
      list.push(example);
      map.set(example.sourceLine, list);
    }
    return map;
  }, [examples]);

  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    const applyHash = () => {
      const line = parseLineHash(window.location.hash);
      if (!line) return;
      const el = document.getElementById(lineAnchorId(line));
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashLine(line);
      window.setTimeout(() => setFlashLine(null), 1600);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [lines.length]);

  useEffect(() => {
    const key = `text-scroll:${textId}`;
    const save = () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };
    window.addEventListener("scroll", save, { passive: true });
    if (!scrollRestored.current && !window.location.hash) {
      const raw = sessionStorage.getItem(key);
      const y = raw ? Number(raw) : NaN;
      if (Number.isFinite(y) && y > 0) {
        window.scrollTo(0, y);
      }
      scrollRestored.current = true;
    }
    return () => window.removeEventListener("scroll", save);
  }, [textId]);

  const copyText = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {offerSentenceSplit ? (
        <p className="text-sm text-[var(--ink-muted)]">
          Looks like prose in few lines.{" "}
          <Link
            href={`/texts/${textId}/edit`}
            className="text-[var(--accent)] hover:underline"
          >
            Split into sentence lines
          </Link>{" "}
          on the edit form, then save.
        </p>
      ) : null}

      {showLineFilter ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-[var(--ink-muted)]">
            Search within text
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter lines…"
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      ) : null}

      <div
        className="font-arabic text-[1.25rem] leading-[1.9] text-[var(--ink)] sm:text-[1.35rem] sm:leading-[1.95]"
        lang="ar"
        dir="rtl"
      >
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const matchesQuery =
            !normalizedQuery ||
            line.toLowerCase().includes(normalizedQuery);
          if (!matchesQuery) return null;

          const lineExamples = examplesByLine.get(lineNumber) ?? [];
          const isFlash = flashLine === lineNumber;
          const menuOpen = openMenu === lineNumber;

          return (
            <div
              key={lineNumber}
              id={lineAnchorId(lineNumber)}
              className={`group relative grid grid-cols-[2.5rem_1fr] gap-3 border-r-2 py-1.5 pr-2 transition-colors ${
                isFlash
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                  : "border-transparent hover:border-[var(--line)]"
              }`}
            >
              <div
                className="select-none pt-1 text-left font-sans text-[11px] tabular-nums leading-none text-[var(--ink-muted)]"
                dir="ltr"
                aria-hidden
              >
                {String(lineNumber).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 whitespace-pre-wrap">
                    {line.length > 0
                      ? renderLinkedArabic(line, links)
                      : "\u00a0"}
                  </div>
                  <div className="relative shrink-0" dir="ltr">
                    <button
                      type="button"
                      className="rounded px-1.5 py-0.5 text-xs text-[var(--ink-muted)] opacity-0 hover:bg-[var(--surface)] hover:text-[var(--accent)] group-hover:opacity-100 focus:opacity-100"
                      aria-label={`Line ${lineNumber} actions`}
                      onClick={() =>
                        setOpenMenu(menuOpen ? null : lineNumber)
                      }
                    >
                      ···
                    </button>
                    {menuOpen ? (
                      <div className="absolute end-0 top-full z-20 mt-1 w-48 rounded-md border border-[var(--line)] bg-[var(--surface)] py-1 text-start text-sm shadow-sm">
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
                          onClick={() => {
                            void copyText(line);
                            setOpenMenu(null);
                          }}
                        >
                          Copy line
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
                          onClick={() => {
                            const url = `${window.location.origin}${lineHref(textId, lineNumber)}`;
                            void copyText(url);
                            setOpenMenu(null);
                          }}
                        >
                          Copy link to line
                        </button>
                        <Link
                          href={`/examples/new?text=${textId}&line=${lineNumber}&arabic=${encodeURIComponent(line)}`}
                          className="block px-3 py-1.5 hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
                          onClick={() => setOpenMenu(null)}
                        >
                          Add example from line
                        </Link>
                        {lineExamples.length > 0 ? (
                          <div className="border-t border-[var(--line)] pt-1">
                            <p className="px-3 py-1 text-xs text-[var(--ink-muted)]">
                              Examples ({lineExamples.length})
                            </p>
                            {lineExamples.map((ex) => (
                              <Link
                                key={ex.id}
                                href={`/examples/${ex.id}`}
                                className="block truncate px-3 py-1.5 font-arabic text-base hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
                                dir="rtl"
                                onClick={() => setOpenMenu(null)}
                              >
                                {ex.arabic}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasTranslation ? (
        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5">
          <button
            type="button"
            onClick={() => setShowTranslation((value) => !value)}
            className="self-start text-sm text-[var(--accent)] hover:underline"
            aria-expanded={showTranslation}
          >
            {showTranslation ? "Hide translation" : "Show translation"}
          </button>
          {showTranslation ? (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)] sm:text-base">
              {translation}
            </p>
          ) : null}
        </div>
      ) : null}

      {links.length > 0 ? (
        <p className="text-xs text-[var(--ink-muted)]">
          Underlined Arabic jumps to linked vocabulary or structures.
        </p>
      ) : null}
    </div>
  );
}
