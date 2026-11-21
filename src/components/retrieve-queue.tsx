"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { gradeReview } from "@/app/(app)/today/actions";
import { lineHref } from "@/lib/text-lines";
import type { RetrieveCard } from "@/lib/session-data";
import type { ReviewGrade } from "@/lib/review";

const GRADES: { id: ReviewGrade; label: string }[] = [
  { id: "again", label: "Again" },
  { id: "hard", label: "Hard" },
  { id: "good", label: "Good" },
  { id: "easy", label: "Easy" },
];

export function RetrieveQueue({
  cards,
  onDone,
}: {
  cards: RetrieveCard[];
  onDone: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [failed, setFailed] = useState<
    { card: RetrieveCard; grade: ReviewGrade }[]
  >([]);
  const card = cards[index];

  // Optimistic: advance now, save in the background, surface failures for retry.
  const save = (target: RetrieveCard, grade: ReviewGrade) => {
    void gradeReview(target.reviewId, grade)
      .then((result) => {
        if (result.error) throw new Error(result.error);
      })
      .catch(() => {
        setFailed((current) => [...current, { card: target, grade }]);
      });
  };

  const retryFailed = () => {
    const pendingRetries = failed;
    setFailed([]);
    for (const row of pendingRetries) save(row.card, row.grade);
  };

  if (cards.length === 0) {
    return (
      <p className="text-[15px] text-[var(--ink-muted)]">
        No due sentences. Learn an example from the text, then return.
      </p>
    );
  }

  if (!card) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-[var(--ink)]">Queue clear.</p>
        <FailedSaves count={failed.length} onRetry={retryFailed} />
        <button
          type="button"
          onClick={onDone}
          className="self-start rounded-[var(--radius-md)] bg-[var(--accent)] hover:bg-[var(--accent-strong)] transition-colors px-4 py-2.5 text-sm font-medium text-[var(--on-accent)]"
        >
          Continue
        </button>
      </div>
    );
  }

  const playCue = () => {
    const el = audioRef.current;
    if (!el || card.audioUrl == null) return;
    const start = (card.startMs ?? 0) / 1000;
    const end = card.endMs != null ? card.endMs / 1000 : null;
    el.currentTime = start;
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

  const onGrade = (grade: ReviewGrade) => {
    save(card, grade);
    setRevealed(false);
    setIndex((current) => current + 1);
  };

  const hasAudioCue = Boolean(card.audioUrl);
  const hasGloss = Boolean(card.translation?.trim());

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-[var(--ink-muted)]">
        {index + 1} / {cards.length}
      </p>
      {hasAudioCue ? (
        <audio ref={audioRef} src={card.audioUrl ?? undefined} preload="auto" />
      ) : null}

      <div className="flex flex-col gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-4">
        {hasAudioCue ? (
          <button
            type="button"
            onClick={playCue}
            className="self-start rounded-[var(--radius-md)] bg-[var(--accent)] hover:bg-[var(--accent-strong)] transition-colors px-4 py-2.5 text-sm font-medium text-[var(--on-accent)]"
          >
            Play cue
          </button>
        ) : null}
        {hasGloss ? (
          <p className="text-[15px] leading-relaxed text-[var(--ink)]">
            {card.translation}
          </p>
        ) : !hasAudioCue ? (
          <p className="text-[15px] text-[var(--ink-muted)]">
            Recall the sentence
            {card.textTitle ? ` from ${card.textTitle}` : ""}.
          </p>
        ) : null}
        <p className="text-sm text-[var(--ink-muted)]">
          Say it out loud. Then reveal.
        </p>
      </div>

      {revealed ? (
        <div className="flex flex-col gap-3">
          <p
            className="font-arabic text-2xl leading-relaxed text-[var(--ink)]"
            lang="ar"
            dir="rtl"
          >
            {card.arabic}
          </p>
          {card.textId && card.sourceLine != null ? (
            <Link
              href={lineHref(card.textId, card.sourceLine)}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Hear it in the text
            </Link>
          ) : null}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((grade) => (
              <button
                key={grade.id}
                type="button"
                onClick={() => void onGrade(grade.id)}
                className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
              >
                {grade.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="self-start rounded-md border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--ink)]"
        >
          Reveal
        </button>
      )}
      <FailedSaves count={failed.length} onRetry={retryFailed} />
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
