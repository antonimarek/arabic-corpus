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
  formatPlaybackClock,
  lineAtTimeMs,
  linePlaybackWindow,
  normalizeLineStarts,
  setLineStart,
} from "@/lib/audio";
import { saveTextLineStarts } from "@/app/(app)/texts/audio-actions";
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

export type TextAudioProps = {
  url: string;
  durationMs: number | null;
  lineStarts: number[] | null;
};

type TextLineReaderProps = {
  textId: string;
  arabic: string;
  translation?: string | null;
  links?: ArabicLink[];
  knownLinks?: ArabicLink[];
  examples?: LineExampleRef[];
  audio?: TextAudioProps | null;
  hideTranslation?: boolean;
  hideLookup?: boolean;
  fixedRate?: number;
};

export function TextLineReader({
  textId,
  arabic,
  translation,
  links = [],
  knownLinks = [],
  examples = [],
  audio = null,
  hideTranslation = false,
  hideLookup = false,
  fixedRate,
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
  const hasTranslation = Boolean(translation?.trim()) && !hideTranslation;
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAtRef = useRef<number | null>(null);
  const scrubbingRef = useRef(false);
  const audioUrlRef = useRef(audio?.url ?? null);
  const restorePlaybackRef = useRef<{
    timeSec: number;
    wasPlaying: boolean;
  } | null>(null);
  const stampSaveChainRef = useRef<Promise<void>>(Promise.resolve());
  const [marking, setMarking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(audio?.durationMs ?? 0);
  const [rate, setRate] = useState(fixedRate ?? 1);
  const [lineStarts, setLineStarts] = useState(() =>
    normalizeLineStarts(audio?.lineStarts),
  );
  const [lineStartsSource, setLineStartsSource] = useState(audio?.lineStarts);
  if (audio?.lineStarts !== lineStartsSource) {
    setLineStartsSource(audio?.lineStarts);
    setLineStarts(normalizeLineStarts(audio?.lineStarts));
  }

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = fixedRate ?? rate;
  }, [fixedRate, rate, audio?.url]);

  useEffect(() => {
    const nextUrl = audio?.url ?? null;
    const prevUrl = audioUrlRef.current;
    if (nextUrl === prevUrl) return;
    const el = audioRef.current;
    if (el && prevUrl && nextUrl && (el.currentTime > 0.05 || !el.paused)) {
      restorePlaybackRef.current = {
        timeSec: el.currentTime,
        wasPlaying: !el.paused,
      };
    } else {
      restorePlaybackRef.current = null;
    }
    audioUrlRef.current = nextUrl;
  }, [audio?.url]);

  const restorePlaybackAfterSrcSwap = useCallback(() => {
    const el = audioRef.current;
    const restore = restorePlaybackRef.current;
    if (!el || !restore) return;
    restorePlaybackRef.current = null;
    const apply = () => {
      el.currentTime = restore.timeSec;
      setCurrentMs(Math.round(restore.timeSec * 1000));
      if (restore.wasPlaying) {
        void el.play();
      }
    };
    if (el.readyState >= 1) {
      apply();
      return;
    }
    el.addEventListener("loadedmetadata", apply, { once: true });
  }, []);

  const queueStampSave = useCallback(
    (starts: (number | null)[]) => {
      stampSaveChainRef.current = stampSaveChainRef.current
        .catch(() => undefined)
        .then(async () => {
          await saveTextLineStarts(textId, starts);
        });
    },
    [textId],
  );

  const seekToMs = useCallback((ms: number) => {
    const el = audioRef.current;
    if (!el) return;
    stopAtRef.current = null;
    const maxMs = Number.isFinite(el.duration) ? el.duration * 1000 : durationMs;
    const next = Math.max(0, Math.min(ms, maxMs || 0));
    el.currentTime = next / 1000;
    setCurrentMs(next);
  }, [durationMs]);

  const playSpan = useCallback((startMs: number, endMs: number | null) => {
    const el = audioRef.current;
    if (!el) return;
    stopAtRef.current = endMs != null ? endMs / 1000 : null;
    el.currentTime = startMs / 1000;
    setCurrentMs(startMs);
    void el.play();
  }, []);

  const playLine = useCallback(
    (lineNumber: number) => {
      const span = linePlaybackWindow(
        lineStarts,
        lineNumber,
        durationMs || audio?.durationMs || null,
      );
      if (!span) return;
      playSpan(span.startMs, span.endMs);
    },
    [audio?.durationMs, durationMs, lineStarts, playSpan],
  );

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

  const markedLineCount = lineStarts.filter((start) => start != null).length;
  const activeLine = lineAtTimeMs(lineStarts, currentMs);

  const onLineNumberClick = (lineNumber: number, hasLineTranslation: boolean) => {
    const el = audioRef.current;
    if (marking && el && audio) {
      const next = setLineStart(lineStarts, lineNumber, el.currentTime * 1000);
      setLineStarts(next);
      queueStampSave(next);
      return;
    }
    const span = linePlaybackWindow(
      lineStarts,
      lineNumber,
      durationMs || audio?.durationMs || null,
    );
    if (span) {
      playLine(lineNumber);
      return;
    }
    if (audio) return;
    if (hasLineTranslation) {
      toggleLineTranslation(lineNumber);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {audio ? (
        <div className="ui-panel flex flex-col gap-2 px-3 py-3">
          <audio
            ref={audioRef}
            src={audio.url}
            preload="metadata"
            onLoadedMetadata={(event) => {
              const ms = event.currentTarget.duration * 1000;
              if (Number.isFinite(ms) && ms > 0) setDurationMs(Math.round(ms));
              restorePlaybackAfterSrcSwap();
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              stopAtRef.current = null;
            }}
            onTimeUpdate={(event) => {
              const el = event.currentTarget;
              if (!scrubbingRef.current) {
                setCurrentMs(Math.round(el.currentTime * 1000));
              }
              const stopAt = stopAtRef.current;
              if (stopAt == null) return;
              if (el.currentTime >= stopAt) {
                el.pause();
                stopAtRef.current = null;
              }
            }}
          />
          <div className="flex flex-col gap-2" dir="ltr">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="min-h-11 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
                onClick={() => {
                  const el = audioRef.current;
                  if (!el) return;
                  if (el.paused) {
                    stopAtRef.current = null;
                    void el.play();
                  } else {
                    el.pause();
                  }
                }}
              >
                {playing ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)]"
                onClick={() => seekToMs(currentMs - 5000)}
              >
                −5s
              </button>
              <button
                type="button"
                className="min-h-11 rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)]"
                onClick={() => seekToMs(currentMs + 5000)}
              >
                +5s
              </button>
              {fixedRate == null
                ? [0.75, 0.9, 1].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={rate === value}
                      className={`min-h-11 rounded-md px-3 py-2 text-sm ${
                        rate === value
                          ? "bg-[var(--accent)] text-white"
                          : "border border-[var(--line)] text-[var(--ink)]"
                      }`}
                      onClick={() => setRate(value)}
                    >
                      {value}×
                    </button>
                  ))
                : (
                  <span className="text-sm text-[var(--ink-muted)]">{fixedRate}×</span>
                )}
            </div>
            <label className="flex min-h-11 items-center gap-3">
              <span className="w-10 shrink-0 font-sans text-xs tabular-nums text-[var(--ink-muted)]">
                {formatPlaybackClock(currentMs)}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(durationMs, 1)}
                step={50}
                value={Math.min(currentMs, durationMs || 0)}
                disabled={durationMs <= 0}
                aria-label="Playback position"
                aria-valuetext={formatPlaybackClock(currentMs)}
                className="h-11 w-full accent-[var(--accent)]"
                onPointerDown={() => {
                  scrubbingRef.current = true;
                }}
                onPointerUp={() => {
                  scrubbingRef.current = false;
                }}
                onPointerCancel={() => {
                  scrubbingRef.current = false;
                }}
                onChange={(event) => {
                  seekToMs(Number(event.currentTarget.value));
                }}
              />
              <span className="w-10 shrink-0 text-end font-sans text-xs tabular-nums text-[var(--ink-muted)]">
                {formatPlaybackClock(durationMs)}
              </span>
            </label>
          </div>
          <button
            type="button"
            aria-pressed={marking}
            className={`self-start min-h-11 rounded-md px-3 py-2 text-sm ${
              marking
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] text-[var(--ink)]"
            }`}
            onClick={() => setMarking((open) => !open)}
          >
            {marking ? "Stop stamping lines" : "Stamp line starts"}
          </button>
          <p className="text-xs text-[var(--ink-muted)]">
            {marking
              ? "Drag the slider to a speaker start, then tap that line number. Tap again to fix a miss."
              : markedLineCount > 0
                ? `Stamped ${markedLineCount} of ${nonEmptyLineCount}. Tap a stamped number to play that speaker only.`
                : "Stamp each speaker start so a line number plays that clip, not the whole track."}
          </p>
        </div>
      ) : null}

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
            className="ui-input text-sm"
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

      {hasKnownHits && !hideLookup ? (
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
              className={`group relative grid grid-cols-[3rem_1fr] gap-3 border-r-2 py-1.5 pr-2 transition-colors ${
                isFlash || activeLine === lineNumber
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                  : "border-transparent hover:border-[var(--line)]"
              }`}
            >
              <button
                type="button"
                className={`flex min-h-11 w-full select-none flex-col items-start gap-0.5 pt-1 text-left font-sans text-[11px] tabular-nums leading-none ${
                  lineStarts[lineNumber - 1] != null
                    ? "text-[var(--accent)]"
                    : "text-[var(--ink-muted)]"
                }`}
                dir="ltr"
                aria-label={
                  marking
                    ? `Line ${lineNumber}, stamp start at ${formatPlaybackClock(currentMs)}`
                    : lineStarts[lineNumber - 1] != null
                      ? `Line ${lineNumber}, play clip`
                      : audio
                        ? `Line ${lineNumber}, not stamped`
                        : lineTranslation
                          ? `Line ${lineNumber}, toggle translation`
                          : `Line ${lineNumber}`
                }
                onClick={() => onLineNumberClick(lineNumber, Boolean(lineTranslation))}
              >
                {String(lineNumber).padStart(2, "0")}
                {lineStarts[lineNumber - 1] != null ? (
                  <span className="text-[10px] text-[var(--ink-muted)]">
                    {formatPlaybackClock(lineStarts[lineNumber - 1] ?? 0)}
                  </span>
                ) : marking ? (
                  <span className="text-[10px] text-[var(--ink-muted)]">tap</span>
                ) : null}
              </button>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  {hideLookup ? (
                    <div className="min-w-0 flex-1 whitespace-pre-wrap">
                      {line.length > 0 ? line : "\u00a0"}
                    </div>
                  ) : (
                    <ArabicSelectionMenu
                      className="min-w-0 flex-1 whitespace-pre-wrap"
                      textId={textId}
                      lineNumber={lineNumber}
                      lineTranslation={lineTranslation}
                    >
                      {({ onPhraseActivate }) => (
                        <div>
                          {line.length > 0
                            ? renderLinkedArabic(line, activeLinks, onPhraseActivate)
                            : "\u00a0"}
                        </div>
                      )}
                    </ArabicSelectionMenu>
                  )}
                  {!hideLookup ? (
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
                      <div className="absolute end-0 top-full z-20 mt-1 w-48 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-raised)] py-1 text-start text-sm shadow-[var(--shadow-soft)]">
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
                  ) : null}
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
        {audio
          ? " Line numbers play a stamped clip. Use Stamp line starts once per speaker."
          : alignment.aligned
            ? " Tap a line number to reveal that line meaning."
            : null}
      </p>
    </div>
  );
}
