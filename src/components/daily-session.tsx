"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";

import { gradeCard, moreCards } from "@/app/(app)/today/actions";
import type { DailyCard, DailySession } from "@/lib/daily-session";
import type { ReviewGrade } from "@/lib/review";
import { lineHref } from "@/lib/text-lines";

const GRADES: { id: ReviewGrade; label: string; key: string }[] = [
  { id: "again", label: "Again", key: "1" },
  { id: "hard", label: "Hard", key: "2" },
  { id: "good", label: "Good", key: "3" },
  { id: "easy", label: "Easy", key: "4" },
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
    <div className="flex flex-col gap-5 pb-36 sm:pb-0">
      <p className="text-sm text-[var(--ink-muted)]" aria-live="polite">
        today: {left} left
      </p>
      <CardView
        key={`${card.key}:${card.round}`}
        card={card}
        revealed={revealed}
      />
      <FailedSaves count={failed.length} onRetry={retryFailed} />
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--line)] bg-[var(--background)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:static sm:border-0 sm:bg-transparent sm:p-0">
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
                className={`flex min-h-14 flex-col items-center justify-center rounded-[var(--radius-sm)] border text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  g.id === "good"
                    ? "border-transparent bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--line))]"
                }`}
              >
                {g.label}
                <span className="hidden text-[11px] font-normal opacity-70 sm:block">
                  {g.key}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mx-auto block min-h-14 w-full max-w-2xl rounded-[var(--radius-sm)] bg-[var(--accent)] text-[15px] font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Reveal
            <span className="ml-2 hidden text-xs font-normal opacity-75 sm:inline">
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
    <article className="ui-panel flex flex-col gap-6 px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--ink-muted)]">
        <span>
          {card.kind === "new" ? "New" : card.round > 0 ? "Again" : "Review"}
        </span>
        {card.audioUrl ? (
          <>
            <audio ref={audioRef} src={card.audioUrl} preload="metadata" />
            <button
              type="button"
              onClick={play}
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--line)] px-3 text-sm text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            >
              ▶ Listen
            </button>
          </>
        ) : null}
      </div>
      <p
        lang="ar"
        dir="rtl"
        className="font-arabic text-center text-[2rem] leading-[1.9] text-[var(--ink)] sm:text-[2.5rem]"
      >
        {card.arabic}
      </p>
      {revealed ? (
        <div className="flex flex-col gap-4 border-t border-[var(--line)] pt-5">
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
              className="font-arabic flex flex-col gap-1 text-lg leading-[1.9] text-[var(--ink-muted)]"
            >
              {card.contextBefore ? <p>{card.contextBefore}</p> : null}
              <p className="text-[var(--ink)]">{card.arabic}</p>
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
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <p className="text-[15px] text-[var(--ink-muted)]">today: {left} left</p>
      <button
        type="button"
        autoFocus
        onClick={onStart}
        className="min-h-14 w-full max-w-xs rounded-[var(--radius-sm)] bg-[var(--accent)] text-lg font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        Start
      </button>
      {streak > 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">
          {streak === 1 ? "1 day" : `${streak} days`} in a row
        </p>
      ) : null}
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
      <section className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-medium text-[var(--ink)]">
          {total > 0 ? "Done for today" : "Nothing due today"}
        </h1>
        {total > 0 ? (
          <p className="text-[15px] text-[var(--ink-muted)]">
            {total === 1 ? "1 card" : `${total} cards`}
            {stats.fresh > 0 ? ` · ${stats.fresh} new` : ""}
          </p>
        ) : null}
        {streak > 0 ? (
          <p className="text-[15px] text-[var(--ink)]">
            {streak === 1 ? "1 day" : `${streak} days`} in a row
          </p>
        ) : null}
        {failed}
      </section>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onMore}
          disabled={loadingMore}
          className="min-h-12 rounded-[var(--radius-sm)] border border-[var(--line)] px-5 text-[15px] text-[var(--ink)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {loadingMore ? "Loading…" : "+5 more"}
        </button>
        {moreEmpty ? (
          <p className="text-sm text-[var(--ink-muted)]">
            Nothing else to add right now.
          </p>
        ) : null}
      </div>

      <section className="flex flex-col gap-2 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm text-[var(--ink-muted)]">If you want more</h2>
        <Link
          href="/today?mode=text"
          className="flex min-h-12 items-center rounded-[var(--radius-sm)] px-1 text-[15px] text-[var(--accent)] hover:underline"
        >
          Listen and read a text
        </Link>
        <Link
          href="/today?mode=fluency"
          className="flex min-h-12 items-center rounded-[var(--radius-sm)] px-1 text-[15px] text-[var(--accent)] hover:underline"
        >
          Fluency replay
        </Link>
      </section>
    </div>
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
    <div className="flex flex-col items-center gap-6 py-10" aria-busy="true">
      <div className="h-4 w-28 animate-pulse rounded bg-[var(--line)]" />
      <div className="h-14 w-full max-w-xs animate-pulse rounded-[var(--radius-sm)] bg-[var(--line)] opacity-60" />
    </div>
  );
}
