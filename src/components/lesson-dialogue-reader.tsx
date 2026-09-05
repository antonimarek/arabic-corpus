"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ArabicSelectionMenu } from "@/components/arabic-selection-menu";
import { MixedScriptText } from "@/components/mixed-script-text";
import {
  renderLinkedArabic,
  type ArabicLink,
} from "@/lib/highlight-arabic";
import { parseDialogueLines, roleLabel } from "@/lib/lesson-dialogue";
import { extractArabicRuns, extractLatinRuns } from "@/lib/mixed-script";
import { newStructureHref } from "@/lib/capture-href";
import type { TextAudioController } from "@/lib/text-audio-controller";
import {
  LINE_FILTER_MIN_LINES,
  lineAnchorId,
  lineHref,
  parseLineHash,
  splitTextLines,
} from "@/lib/text-lines";

export type LineExampleRef = {
  id: string;
  arabic: string;
  sourceLine: number | null;
};

type DialogueWordMode = "aligned" | "speakers";

type LessonDialogueReaderProps = {
  textId: string;
  arabic: string;
  /** Same line structure as arabic; Fathom wording only (roles stay trustworthy). */
  fathomArabic?: string | null;
  /** Same line structure; Wispr wording on Fathom times/roles. */
  wisprArabic?: string | null;
  links?: ArabicLink[];
  knownLinks?: ArabicLink[];
  examples?: LineExampleRef[];
  audioController: TextAudioController | null;
  hideLookup?: boolean;
};

export function LessonDialogueReader({
  textId,
  arabic,
  fathomArabic = null,
  wisprArabic = null,
  links = [],
  knownLinks = [],
  examples = [],
  audioController,
  hideLookup = false,
}: LessonDialogueReaderProps) {
  const speakersArabic = wisprArabic?.trim() || fathomArabic?.trim() || null;
  const speakersLabel = wisprArabic?.trim()
    ? "Speakers (Wispr)"
    : "Speakers (Fathom)";
  const hasSpeakers = Boolean(speakersArabic);
  const [wordMode, setWordMode] = useState<DialogueWordMode>(
    hasSpeakers ? "speakers" : "aligned",
  );
  const displayArabic =
    wordMode === "speakers" && speakersArabic ? speakersArabic : arabic;
  const lines = useMemo(() => parseDialogueLines(displayArabic), [displayArabic]);
  const rawLines = useMemo(() => splitTextLines(displayArabic), [displayArabic]);
  const nonEmptyLineCount = useMemo(
    () => rawLines.filter((line) => line.trim().length > 0).length,
    [rawLines],
  );
  const showLineFilter = nonEmptyLineCount >= LINE_FILTER_MIN_LINES;
  const [query, setQuery] = useState("");
  const [flashLine, setFlashLine] = useState<number | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const activeLinks = links;

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

  const copyText = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  }, []);

  const controller = audioController;
  const lineStarts = controller?.lineStarts ?? [];
  const activeLine = controller?.activeLine ?? null;
  const marking = controller?.marking ?? false;

  return (
    <div className="flex flex-col gap-5">
      {hasSpeakers ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inline-flex rounded-[var(--radius-md)] border border-[var(--line)] p-0.5"
            role="group"
            aria-label="Dialogue word source"
          >
            <button
              type="button"
              className={`min-h-10 rounded-[var(--radius-sm)] px-3 text-sm ${
                wordMode === "speakers"
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--ink)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
              onClick={() => setWordMode("speakers")}
            >
              {speakersLabel}
            </button>
            <button
              type="button"
              className={`min-h-10 rounded-[var(--radius-sm)] px-3 text-sm ${
                wordMode === "aligned"
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--ink)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
              onClick={() => setWordMode("aligned")}
            >
              Aligned (STT)
            </button>
          </div>
          <p className="text-xs text-[var(--ink-muted)]">
            {wordMode === "speakers"
              ? wisprArabic?.trim()
                ? "Fathom times/roles + Wispr wording. Best default for reading."
                : "Roles from Fathom. Words may lack Arabic script."
              : "STT words in Fathom speaker windows. Better Arabic; roles can slip on short turns."}
          </p>
        </div>
      ) : null}

      {showLineFilter ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-[var(--ink-muted)]">
            Search within dialogue
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter lines…"
            className="ui-input text-sm"
          />
        </label>
      ) : null}

      <div className="flex flex-col gap-1">
        {lines.map((line) => {
          const matchesQuery =
            !normalizedQuery ||
            line.text.toLowerCase().includes(normalizedQuery) ||
            line.raw.toLowerCase().includes(normalizedQuery);
          if (!matchesQuery) return null;

          const lineNumber = line.lineNumber;
          const lineExamples = examplesByLine.get(lineNumber) ?? [];
          const isFlash = flashLine === lineNumber;
          const menuOpen = openMenu === lineNumber;
          const arabicOnly = extractArabicRuns(line.text).join(" ");
          const latinOnly = extractLatinRuns(line.text).join(" ");
          const stampedStart = lineStarts[lineNumber - 1];

          return (
            <div
              key={lineNumber}
              id={lineAnchorId(lineNumber)}
              className={`group relative grid grid-cols-[3rem_1fr] gap-3 border-s-2 py-2 ps-2 transition-colors ${
                isFlash || activeLine === lineNumber
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                  : "border-transparent hover:border-[var(--line)]"
              }`}
            >
              <button
                type="button"
                className={`flex min-h-11 w-full select-none flex-col items-start gap-0.5 pt-1 text-left font-sans text-[11px] tabular-nums leading-none ${
                  stampedStart != null
                    ? "text-[var(--accent)]"
                    : "text-[var(--ink-muted)]"
                }`}
                dir="ltr"
                aria-label={`Line ${lineNumber}`}
                onClick={() => controller?.onLineNumberClick(lineNumber)}
              >
                {String(lineNumber).padStart(2, "0")}
                {stampedStart != null && controller ? (
                  <span className="text-[10px] text-[var(--ink-muted)]">
                    {controller.formatClock(stampedStart)}
                  </span>
                ) : marking ? (
                  <span className="text-[10px] text-[var(--ink-muted)]">tap</span>
                ) : null}
              </button>

              <div className="min-w-0">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      line.role === "TUTOR"
                        ? "bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]"
                        : line.role === "STUDENT"
                          ? "bg-[var(--surface)] text-[var(--ink-muted)]"
                          : "text-[var(--ink-muted)]"
                    }`}
                  >
                    {roleLabel(line.role)}
                  </span>
                  {!hideLookup ? (
                    <div className="relative shrink-0" dir="ltr">
                      <button
                        type="button"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded text-lg leading-none text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--accent)]"
                        aria-label={`Line ${lineNumber} actions`}
                        onClick={() => setOpenMenu(menuOpen ? null : lineNumber)}
                      >
                        +
                      </button>
                      {menuOpen ? (
                        <div className="absolute end-0 top-full z-20 mt-1 w-48 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-raised)] py-1 text-start text-sm shadow-[var(--shadow-soft)]">
                          <button
                            type="button"
                            className="block w-full min-h-11 px-3 py-2.5 text-left hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
                            onClick={() => {
                              void copyText(line.text);
                              setOpenMenu(null);
                            }}
                          >
                            Copy line
                          </button>
                          <button
                            type="button"
                            className="block w-full min-h-11 px-3 py-2.5 text-left hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
                            onClick={() => {
                              const url = `${window.location.origin}${lineHref(textId, lineNumber)}`;
                              void copyText(url);
                              setOpenMenu(null);
                            }}
                          >
                            Copy link to line
                          </button>
                          <Link
                            href={`/examples/new?text=${textId}&line=${lineNumber}&arabic=${encodeURIComponent(arabicOnly)}`}
                            className="flex min-h-11 items-center px-3 py-2.5 hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
                            onClick={() => setOpenMenu(null)}
                          >
                            Add example from line
                          </Link>
                          <Link
                            href={newStructureHref({
                              arabic: arabicOnly,
                              textId,
                              lineNumber,
                            })}
                            className="flex min-h-11 items-center px-3 py-2.5 hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
                            onClick={() => setOpenMenu(null)}
                          >
                            Add structure from line
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
                                  className="block truncate min-h-11 px-3 py-2.5 font-arabic text-base hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
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
                  ) : null}
                </div>

                {hideLookup ? (
                  <MixedScriptText text={line.text} variant="dialogue" />
                ) : (
                  <ArabicSelectionMenu
                    className="min-w-0"
                    textId={textId}
                    lineNumber={lineNumber}
                    lineTranslation={null}
                  >
                    {({ onPhraseActivate }) => (
                      <div className="flex flex-col gap-2">
                        {arabicOnly ? (
                          <div
                            className="font-arabic text-[1.35rem] leading-[1.85] text-[var(--ink)] sm:text-[1.45rem]"
                            lang="ar"
                            dir="rtl"
                          >
                            {renderLinkedArabic(arabicOnly, activeLinks, onPhraseActivate)}
                          </div>
                        ) : null}
                        {latinOnly ? (
                          <p
                            className="font-sans text-sm leading-relaxed text-[var(--ink-muted)]"
                            dir="ltr"
                          >
                            {latinOnly}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </ArabicSelectionMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
