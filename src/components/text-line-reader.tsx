"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { ArabicSelectionMenu } from "@/components/arabic-selection-menu";
import {
  renderLinkedArabic,
  findMatches,
  type ArabicLink,
} from "@/lib/highlight-arabic";
import {
  getReviewModeServerSnapshot,
  getReviewModeSnapshot,
  getShowTranslationServerSnapshot,
  getShowTranslationSnapshot,
  subscribeReviewMode,
  subscribeShowTranslation,
  writeReviewMode,
  writeShowTranslation,
} from "@/lib/prefs";
import {
  LINE_FILTER_MIN_LINES,
  alignTranslationLines,
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
  knownLinks?: ArabicLink[];
  examples?: LineExampleRef[];
};

export function TextLineReader({
  textId,
  arabic,
  translation,
  links = [],
  knownLinks = [],
  examples = [],
}: TextLineReaderProps) {
  const lines = useMemo(() => splitTextLines(arabic), [arabic]);
  const alignment = useMemo(
    () => alignTranslationLines(arabic, translation),
    [arabic, translation],
  );
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
  const preferShowAll = useSyncExternalStore(
    subscribeShowTranslation,
    getShowTranslationSnapshot,
    getShowTranslationServerSnapshot,
  );
  const reviewMode = useSyncExternalStore(
    subscribeReviewMode,
    getReviewModeSnapshot,
    getReviewModeServerSnapshot,
  );
  const activeLinks = useMemo(
    () => (reviewMode ? [...links, ...knownLinks] : links),
    [knownLinks, links, reviewMode],
  );
  const hasKnownHits = useMemo(
    () => findMatches(arabic, knownLinks).length > 0,
    [arabic, knownLinks],
  );
  const [revealedLines, setRevealedLines] = useState<Set<number>>(
    () => new Set(),
  );
  const showAllTranslations = hasTranslation && preferShowAll;
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

  const toggleReview = () => {
    writeReviewMode(!reviewMode);
  };

  const toggleShowAll = () => {
    const next = !preferShowAll;
    writeShowTranslation(next);
    if (next) {
      setRevealedLines(new Set());
    }
  };

  const toggleLineTranslation = (lineNumber: number) => {
    if (showAllTranslations) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) {
      return;
    }
    setRevealedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineNumber)) {
        next.delete(lineNumber);
      } else {
        next.add(lineNumber);
      }
      return next;
    });
  };

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

      {hasTranslation && alignment.aligned ? (
        <button
          type="button"
          onClick={toggleShowAll}
          className="self-start text-sm text-[var(--accent)] hover:underline"
          aria-expanded={showAllTranslations}
        >
          {showAllTranslations
            ? "Hide translations"
            : "Show all translations"}
        </button>
      ) : null}

      {hasKnownHits ? (
        <button
          type="button"
          onClick={toggleReview}
          className="self-start text-sm text-[var(--accent)] hover:underline"
          aria-pressed={reviewMode}
        >
          {reviewMode ? "Study: focus only" : "Review: show known words"}
        </button>
      ) : null}

      <div
        className="font-arabic text-[1.45rem] leading-[1.95] text-[var(--ink)] sm:text-[1.6rem]"
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
          const lineTranslation = alignment.aligned
            ? alignment.lines[index]?.translation
            : null;
          const showLineMeaning =
            Boolean(lineTranslation) &&
            (showAllTranslations || revealedLines.has(lineNumber));

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
              <button
                type="button"
                className="flex min-h-11 w-full select-none items-start pt-1 text-left font-sans text-[11px] tabular-nums leading-none text-[var(--ink-muted)]"
                dir="ltr"
                aria-label={
                  lineTranslation
                    ? `Line ${lineNumber}, toggle translation`
                    : `Line ${lineNumber}`
                }
                onClick={() => {
                  if (lineTranslation) {
                    toggleLineTranslation(lineNumber);
                  }
                }}
              >
                {String(lineNumber).padStart(2, "0")}
              </button>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <ArabicSelectionMenu
                    className="min-w-0 flex-1 whitespace-pre-wrap"
                    textId={textId}
                    lineNumber={lineNumber}
                  >
                    {({ onPhraseActivate }) => (
                      <div>
                        {line.length > 0
                          ? renderLinkedArabic(line, activeLinks, onPhraseActivate)
                          : "\u00a0"}
                      </div>
                    )}
                  </ArabicSelectionMenu>
                  <div className="relative shrink-0" dir="ltr">
                    <button
                      type="button"
                      className="flex min-h-11 min-w-11 items-center justify-center rounded text-lg leading-none text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--accent)]"
                      aria-label={`Line ${lineNumber} actions`}
                      onClick={() =>
                        setOpenMenu(menuOpen ? null : lineNumber)
                      }
                    >
                      +
                    </button>
                    {menuOpen ? (
                      <div className="absolute end-0 top-full z-20 mt-1 w-48 rounded-md border border-[var(--line)] bg-[var(--surface)] py-1 text-start text-sm">
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
                {showLineMeaning ? (
                  <p
                    className="mt-1 font-sans text-sm leading-relaxed text-[var(--ink-muted)]"
                    dir="ltr"
                  >
                    {lineTranslation}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {hasTranslation && !alignment.aligned ? (
        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5">
          <button
            type="button"
            onClick={toggleShowAll}
            className="self-start text-sm text-[var(--accent)] hover:underline"
            aria-expanded={showAllTranslations}
          >
            {showAllTranslations ? "Hide translation" : "Show translation"}
          </button>
          {showAllTranslations ? (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)] sm:text-base">
              {translation}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-[var(--ink-muted)]">
        Select Arabic to search or add. Underlined phrases show a gloss.
        {hasKnownHits
          ? " Review marks other words already in your vocabulary."
          : null}
        {alignment.aligned
          ? " Tap a line number to reveal that line meaning."
          : null}
      </p>
    </div>
  );
}
