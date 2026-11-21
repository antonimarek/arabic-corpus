"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";

import { gradeCard, moreCards } from "@/app/(app)/today/actions";
import type { DailyCard, DailySession } from "@/lib/daily-session";
import type { ReviewGrade } from "@/lib/review";
import { lineHref } from "@/lib/text-lines";

const GRADES: {
  id: ReviewGrade;
  label: string;
  key: string;
  color: string;
}[] = [
  { id: "again", label: "Again", key: "1", color: "var(--grade-again)" },
  { id: "hard", label: "Hard", key: "2", color: "var(--grade-hard)" },
  { id: "good", label: "Good", key: "3", color: "var(--accent)" },
  { id: "easy", label: "Easy", key: "4", color: "var(--grade-easy)" },
];

/** An "Again" card comes back at the end of the session, at most this often. */
const MAX_REQUEUE = 2;

type QueueCard = DailyCard & { round: number };
type Phase = "start" | "card" | "end";
type Stats = { graded: number; fresh: number; again: number };

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  );
}

export function DailySessionView({
  session,
}: {
  session: Promise<DailySession>;
}) {
  const initial = use(session);
  const [queue, setQueue] = useState<QueueCard[]>(() =>
    initial.cards.map((card) => ({ ...card, round: 0 })),
  );
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(
    initial.cards.length > 0 ? "start" : "end",
  );
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState<Stats>({ graded: 0, fresh: 0, again: 0 });
  const [failed, setFailed] = useState<
    { card: QueueCard; grade: ReviewGrade }[]
  >([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreEmpty, setMoreEmpty] = useState(false);
  // Saves for the same card run in order (a requeued new card must be
  // enrolled before its second grade lands).
  const chains = useRef(new Map<string, Promise<unknown>>());
  const reviewIds = useRef(new Map<string, string>());

  const card = phase === "card" ? queue[index] : undefined;
  const left = Math.max(0, queue.length - index);

  const save = useCallback((target: QueueCard, grade: ReviewGrade) => {
    const prev = chains.current.get(target.key) ?? Promise.resolve();
    const next = prev.then(async () => {
      try {
        const result = await gradeCard({
          reviewId: reviewIds.current.get(target.key) ?? target.reviewId,
          exampleId: target.exampleId,
          grade,
        });
        if (result.error) throw new Error(result.error);
        if (result.reviewId) reviewIds.current.set(target.key, result.reviewId);
      } catch {
        setFailed((current) => [...current, { card: target, grade }]);
      }
    });
    chains.current.set(target.key, next);
  }, []);

  const grade = useCallback(
    (value: ReviewGrade) => {
      if (!card) return;
      save(card, value);
      setStats((s) => ({
        graded: card.round === 0 ? s.graded + 1 : s.graded,
        fresh: card.round === 0 && card.kind === "new" ? s.fresh + 1 : s.fresh,
        again: value === "again" ? s.again + 1 : s.again,
      }));
      if (value === "again" && card.round < MAX_REQUEUE) {
        setQueue((q) => [...q, { ...card, round: card.round + 1 }]);
      }
      setRevealed(false);
      if (
        index + 1 >= queue.length &&
        !(value === "again" && card.round < MAX_REQUEUE)
      ) {
        setPhase("end");
      }
      setIndex((i) => i + 1);
    },
    [card, index, queue.length, save],
  );

  const retryFailed = () => {
    const rows = failed;
    setFailed([]);
    for (const row of rows) save(row.card, row.grade);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    setMoreEmpty(false);
    const result = await moreCards({
      exampleIds: queue.map((c) => c.exampleId),
      reviewIds: [
        ...queue
          .map((c) => c.reviewId)
          .filter((id): id is string => Boolean(id)),
        ...reviewIds.current.values(),
      ],
    }).catch(() => ({ error: "Failed.", cards: undefined }));
    setLoadingMore(false);
    const fresh = result.cards ?? [];
    if (fresh.length === 0) {
      setMoreEmpty(true);
      return;
    }
    setQueue((q) => [...q, ...fresh.map((c) => ({ ...c, round: 0 }))]);
    setIndex(queue.length);
    setRevealed(false);
    setPhase("card");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      if (phase === "start" && event.key === "Enter") {
        event.preventDefault();
        setPhase("card");
        return;
      }
      if (phase !== "card") return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        const hit = GRADES.find((g) => g.key === event.key);
        if (hit) {
          event.preventDefault();
          grade(hit.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, revealed, grade]);

  if (phase === "start") {
    return (
      <StartScreen
        left={queue.length}
        streak={initial.streak}
        onStart={() => setPhase("card")}
      />
    );
  }

  if (phase === "end" || !card) {
    const activeBefore = initial.doneToday > 0;
    const streak =
      activeBefore || stats.graded === 0 ? initial.streak : initial.streak + 1;
    return (
      <EndScreen
        stats={stats}
        streak={streak}
        doneBefore={initial.doneToday}
        onMore={loadMore}
        loadingMore={loadingMore}
        moreEmpty={moreEmpty}
        failed={<FailedSaves count={failed.length} onRetry={retryFailed} />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-28 md:pb-0">
      <h1 className="sr-only">Today</h1>
      <div className="flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
            style={{
              width: `${queue.length ? (index / queue.length) * 100 : 0}%`,
            }}
          />
        </div>
        <p
          className="shrink-0 text-sm font-medium tabular-nums text-[var(--ink-muted)]"
          aria-live="polite"
        >
          today: <span className="text-[var(--ink)]">{left}</span> left
        </p>
      </div>
      <CardView
        key={`${card.key}:${card.round}`}
        card={card}
        revealed={revealed}
      />
      <FailedSaves count={failed.length} onRetry={retryFailed} />
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] px-4 py-3 backdrop-blur-md md:static md:border-0 md:bg-transparent md:p-0">
        {revealed ? (
          <div
            className="mx-auto grid max-w-2xl grid-cols-4 gap-2"
            role="group"
            aria-label="Grade"
          >
            {GRADES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => grade(g.id)}
                style={{ "--g": g.color } as React.CSSProperties}
                className={`flex min-h-14 flex-col items-center justify-center rounded-[var(--radius-md)] border text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--g)] active:scale-[0.98] ${
                  g.id === "good"
                    ? "border-transparent bg-[var(--g)] text-[var(--on-accent)] shadow-[var(--shadow-soft)] hover:bg-[var(--accent-strong)]"
                    : "border-[color-mix(in_srgb,var(--g)_30%,var(--line))] bg-[color-mix(in_srgb,var(--g)_7%,var(--surface-raised))] text-[var(--g)] hover:bg-[color-mix(in_srgb,var(--g)_14%,var(--surface-raised))]"
                }`}
              >
                {g.label}
                <span className="hidden text-[11px] font-normal opacity-70 md:block">
                  {g.key}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mx-auto block min-h-14 w-full max-w-2xl rounded-[var(--radius-md)] bg-[var(--ink)] text-[15px] font-semibold text-[var(--surface)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_85%,var(--accent))] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Reveal
            <span className="ml-2 hidden text-xs font-normal opacity-75 md:inline">
              space
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function CardView({ card, revealed }: { card: QueueCard; revealed: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const play = () => {
    const el = audioRef.current;
    if (!el) return;
    const end = card.endMs != null ? card.endMs / 1000 : null;
    el.currentTime = (card.startMs ?? 0) / 1000;
    void el.play();
    if (end == null) return;
    const onTime = () => {
      if (el.currentTime >= end) {
        el.pause();
        el.removeEventListener("timeupdate", onTime);
      }
    };
    el.addEventListener("timeupdate", onTime);
  };

  return (
    <article className="relative flex flex-col gap-6 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-raised)] px-5 py-7 shadow-[var(--shadow-soft)] sm:px-10 sm:py-10">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
            card.kind === "new"
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : card.round > 0
                ? "bg-[color-mix(in_srgb,var(--grade-again)_10%,transparent)] text-[var(--grade-again)]"
                : "bg-[var(--surface-hover)] text-[var(--ink-muted)]"
          }`}
        >
          {card.kind === "new" ? "New" : card.round > 0 ? "Again" : "Review"}
        </span>
        {card.audioUrl ? (
          <>
            <audio ref={audioRef} src={card.audioUrl} preload="metadata" />
            <button
              type="button"
              onClick={play}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            >
              <span aria-hidden="true">▶</span> Listen
            </button>
          </>
        ) : null}
      </div>
      <p
        lang="ar"
        dir="rtl"
        className="font-arabic py-4 text-center text-[2.125rem] leading-[1.9] text-balance break-words text-[var(--ink)] sm:py-8 sm:text-[2.75rem]"
      >
        {card.arabic}
      </p>
      {revealed ? (
        <div className="flex flex-col gap-5 border-t border-dashed border-[var(--line)] pt-6 motion-safe:animate-[reveal_200ms_ease-out]">
          {card.translation ? (
            <p className="text-center text-[17px] leading-relaxed text-[var(--ink)]">
              {card.translation}
            </p>
          ) : (
            <p className="text-center text-sm text-[var(--ink-muted)]">
              No translation yet.
            </p>
          )}
          {card.contextBefore || card.contextAfter ? (
            <div
              lang="ar"
              dir="rtl"
              className="font-arabic flex flex-col gap-1 rounded-[var(--radius-md)] bg-[var(--surface)] px-4 py-3 text-lg leading-[1.9] text-[var(--ink-muted)]"
            >
              {card.contextBefore ? <p>{card.contextBefore}</p> : null}
              <p className="font-semibold text-[var(--accent)]">{card.arabic}</p>
              {card.contextAfter ? <p>{card.contextAfter}</p> : null}
            </div>
          ) : null}
          {card.textId && card.textTitle ? (
            <Link
              href={
                card.sourceLine != null
                  ? lineHref(card.textId, card.sourceLine)
                  : `/texts/${card.textId}`
              }
              className="self-center text-sm text-[var(--accent)] hover:underline"
            >
              From {card.textTitle}
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function StartScreen({
  left,
  streak,
  onStart,
}: {
  left: number;
  streak: number;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-7 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-raised)] px-6 py-12 text-center shadow-[var(--shadow-soft)]">
      <h1 className="sr-only">Today</h1>
      <span
        lang="ar"
        dir="rtl"
        aria-hidden="true"
        className="font-arabic text-2xl text-[var(--accent)]"
      >
        يلّا
      </span>
      <div className="flex flex-col items-center gap-1">
        <p className="text-6xl font-semibold tabular-nums tracking-tight text-[var(--ink)]">
          {left}
        </p>
        <p className="text-[15px] text-[var(--ink-muted)]">
          today: {left} left
        </p>
      </div>
      <button
        type="button"
        autoFocus
        onClick={onStart}
        className="min-h-14 w-full max-w-xs rounded-[var(--radius-md)] bg-[var(--accent)] text-lg font-semibold text-[var(--on-accent)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--accent-strong)] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        Start
      </button>
      {streak > 0 ? <StreakBadge streak={streak} /> : null}
    </div>
  );
}

function EndScreen({
  stats,
  streak,
  doneBefore,
  onMore,
  loadingMore,
  moreEmpty,
  failed,
}: {
  stats: Stats;
  streak: number;
  doneBefore: number;
  onMore: () => void;
  loadingMore: boolean;
  moreEmpty: boolean;
  failed: React.ReactNode;
}) {
  const total = stats.graded + doneBefore;
  return (
    <div className="flex flex-col gap-8 py-6">
      <section className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-raised)] px-6 py-10 text-center shadow-[var(--shadow-soft)]">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-2xl text-[var(--accent)]"
        >
          ✓
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
          {total > 0 ? "Done for today" : "Nothing due today"}
        </h1>
        {total > 0 ? (
          <p className="text-[15px] text-[var(--ink-muted)]">
            {total === 1 ? "1 card" : `${total} cards`}
            {stats.fresh > 0 ? ` · ${stats.fresh} new` : ""}
          </p>
        ) : null}
        {streak > 0 ? <StreakBadge streak={streak} /> : null}
        {failed}
      </section>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onMore}
          disabled={loadingMore}
          className="min-h-12 rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[var(--surface-raised)] px-6 text-[15px] font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {loadingMore ? "Loading…" : "+5 more"}
        </button>
        {moreEmpty ? (
          <p className="text-sm text-[var(--ink-muted)]">
            Nothing else to add right now.
          </p>
        ) : null}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          If you want more
        </h2>
        <Link
          href="/today?mode=text"
          className="ui-row min-h-14 !flex-row items-center justify-between text-[15px] font-medium text-[var(--ink)]"
        >
          Listen and read a text
          <span aria-hidden="true" className="text-[var(--ink-muted)]">→</span>
        </Link>
        <Link
          href="/today?mode=fluency"
          className="ui-row min-h-14 !flex-row items-center justify-between text-[15px] font-medium text-[var(--ink)]"
        >
          Fluency replay
          <span aria-hidden="true" className="text-[var(--ink-muted)]">→</span>
        </Link>
      </section>
    </div>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--grade-hard)_12%,transparent)] px-3 py-1 text-sm font-medium text-[var(--grade-hard)]">
      <span aria-hidden="true">🔥</span>
      {streak === 1 ? "1 day" : `${streak} days`} in a row
    </p>
  );
}

function FailedSaves({
  count,
  onRetry,
}: {
  count: number;
  onRetry: () => void;
}) {
  if (count === 0) return null;
  return (
    <p className="text-sm text-[var(--danger)]" role="alert">
      {count === 1 ? "1 grade" : `${count} grades`} didn&apos;t save.{" "}
      <button type="button" onClick={onRetry} className="underline">
        Retry
      </button>
    </p>
  );
}

export function DailySessionSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-raised)] py-16" aria-busy="true">
      <div className="h-4 w-28 motion-safe:animate-pulse rounded bg-[var(--line)]" />
      <div className="h-14 w-full max-w-xs motion-safe:animate-pulse rounded-[var(--radius-sm)] bg-[var(--line)] opacity-60" />
    </div>
  );
}
