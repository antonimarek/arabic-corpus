"use client";

import Link from "next/link";
import { Suspense, use, useEffect, useState, type ReactNode } from "react";

import { FocusTargetStrip } from "@/components/focus-target-strip";
import { LearnExampleList } from "@/components/learn-example-list";
import { RetrieveQueue } from "@/components/retrieve-queue";
import { TextLineReader } from "@/components/text-line-reader";
import {
  nextStep,
  stepsForBudget,
  type SessionBudget,
  type SessionStep,
} from "@/lib/session";
import type { LearnCandidate, RetrieveCard } from "@/lib/session-data";
import {
  clearSessionProgress,
  writeLastFinishedText,
  writeSessionProgress,
} from "@/lib/session-prefs";
import type { TextDetailPayload } from "@/lib/text-detail";

type FluencyText = {
  id: string;
  title: string;
  arabic: string;
  audioUrl: string | null;
  durationMs: number | null;
  lineStarts: number[] | null;
};

export function TodaySession({
  budget,
  text,
  dueCards,
  learnCandidates,
  fluency,
  onlySteps,
}: {
  budget: SessionBudget;
  text: TextDetailPayload;
  dueCards: Promise<RetrieveCard[]>;
  learnCandidates: Promise<LearnCandidate[]>;
  fluency: Promise<FluencyText | null>;
  /** Run just these steps (e.g. fluency replay after the card session). */
  onlySteps?: SessionStep[];
}) {
  if (onlySteps) {
    return (
      <SessionSteps
        budget={budget}
        steps={onlySteps}
        text={text}
        dueCards={dueCards}
        learnCandidates={learnCandidates}
        fluency={fluency}
      />
    );
  }
  // Only the 5-min budget branches on due count; others render instantly.
  if (budget === 5) {
    return (
      <Suspense fallback={<SessionSkeleton />}>
        <FiveMinuteSession
          text={text}
          dueCards={dueCards}
          learnCandidates={learnCandidates}
          fluency={fluency}
        />
      </Suspense>
    );
  }
  return (
    <SessionSteps
      budget={budget}
      steps={stepsForBudget(budget, 0)}
      text={text}
      dueCards={dueCards}
      learnCandidates={learnCandidates}
      fluency={fluency}
    />
  );
}

function FiveMinuteSession(
  props: Omit<Parameters<typeof SessionSteps>[0], "budget" | "steps">,
) {
  const due = use(props.dueCards);
  return (
    <SessionSteps {...props} budget={5} steps={stepsForBudget(5, due.length)} />
  );
}

function SessionSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <div className="h-4 w-24 animate-pulse rounded bg-[var(--line)]" />
      <div className="h-28 animate-pulse rounded-md bg-[var(--line)] opacity-60" />
    </div>
  );
}

function Await<T>({
  value,
  children,
}: {
  value: Promise<T>;
  children: (resolved: T) => ReactNode;
}) {
  return children(use(value));
}

function SessionSteps({
  budget,
  steps,
  text,
  dueCards,
  learnCandidates,
  fluency,
}: {
  budget: SessionBudget;
  steps: SessionStep[];
  text: TextDetailPayload;
  dueCards: Promise<RetrieveCard[]>;
  learnCandidates: Promise<LearnCandidate[]>;
  fluency: Promise<FluencyText | null>;
}) {
  const [step, setStep] = useState<SessionStep>(steps[0] ?? "listen");
  const [done, setDone] = useState(false);

  useEffect(() => {
    writeSessionProgress({ textId: text.id, budget, step });
  }, [budget, step, text.id]);

  const goNext = () => {
    const next = nextStep(steps, step);
    if (next === "done") {
      clearSessionProgress();
      writeLastFinishedText({ id: text.id, title: text.title });
      setDone(true);
      return;
    }
    setStep(next);
  };

  const audio = text.audioUrl
    ? {
        url: text.audioUrl,
        durationMs: text.audioDurationMs,
        lineStarts: text.audioLineStartsMs,
      }
    : null;

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-[var(--ink)]">Session done.</p>
        <Link
          href="/today"
          className="text-sm text-[var(--accent)] hover:underline"
        >
          Back to today
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
          {budget} min · {step}
        </p>
        <h1 className="text-xl font-medium text-[var(--ink)]">{text.title}</h1>
      </header>

      {step === "listen" ? (
        <div className="flex flex-col gap-6">
          {text.focus.length > 0 ? (
            <FocusTargetStrip textId={text.id} focus={text.focus} />
          ) : null}
          <p className="text-sm text-[var(--ink-muted)]">
            Listen for meaning. Translation stays hidden.
          </p>
          <TextLineReader
            textId={text.id}
            arabic={text.arabic}
            translation={text.translation}
            links={text.links}
            audio={audio}
            hideTranslation
          />
          <button
            type="button"
            onClick={goNext}
            className="self-start rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
          >
            Continue
          </button>
        </div>
      ) : null}

      {step === "read" ? (
        <div className="flex flex-col gap-6">
          <TextLineReader
            textId={text.id}
            arabic={text.arabic}
            translation={text.translation}
            links={text.links}
            knownLinks={text.knownLinks}
            examples={text.examples.map((example) => ({
              id: example.id,
              arabic: example.arabic,
              sourceLine: example.source_line,
            }))}
            audio={audio}
          />
          <Suspense fallback={null}>
            <Await value={learnCandidates}>
              {(candidates) =>
                candidates.length > 0 ? (
                  <section className="border-t border-[var(--line)] pt-6">
                    <h2 className="mb-3 text-sm text-[var(--ink-muted)]">
                      Learn a line
                    </h2>
                    <LearnExampleList examples={candidates} />
                  </section>
                ) : null
              }
            </Await>
          </Suspense>
          <button
            type="button"
            onClick={goNext}
            className="self-start rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
          >
            Start retrieve
          </button>
        </div>
      ) : null}

      {step === "retrieve" ? (
        <Suspense fallback={<SessionSkeleton />}>
          <Await value={dueCards}>
            {(cards) => <RetrieveQueue cards={cards} onDone={goNext} />}
          </Await>
        </Suspense>
      ) : null}

      {step === "fluency" ? (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-[var(--ink-muted)]">
            Replay a known text at full speed. No lookup.
          </p>
          <Suspense fallback={<SessionSkeleton />}>
            <Await value={fluency}>
              {(fluency) =>
                fluency?.audioUrl ? (
                  <TextLineReader
                    textId={fluency.id}
                    arabic={fluency.arabic}
                    audio={{
                      url: fluency.audioUrl,
                      durationMs: fluency.durationMs,
                      lineStarts: fluency.lineStarts,
                    }}
                    hideTranslation
                    hideLookup
                    fixedRate={1}
                  />
                ) : (
                  <p className="text-sm text-[var(--ink-muted)]">
                    Finish one audio text, then fluency has a replay target.
                  </p>
                )
              }
            </Await>
          </Suspense>
          <button
            type="button"
            onClick={goNext}
            className="self-start rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
          >
            Finish
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={goNext}
        className="self-start text-sm text-[var(--ink-muted)] hover:underline"
      >
        Skip step
      </button>
    </div>
  );
}
