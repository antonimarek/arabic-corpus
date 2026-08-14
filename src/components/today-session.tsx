"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
}: {
  budget: SessionBudget;
  text: TextDetailPayload;
  dueCards: RetrieveCard[];
  learnCandidates: LearnCandidate[];
  fluency: FluencyText | null;
}) {
  const steps = useMemo(
    () => stepsForBudget(budget, dueCards.length),
    [budget, dueCards.length],
  );
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

  const audio =
    text.audioUrl
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
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
          Back to search
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
            <FocusTargetStrip
              textId={text.id}
              focus={text.focus}
              vocabOptions={text.vocabOptions}
            />
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
          {learnCandidates.length > 0 ? (
            <section className="border-t border-[var(--line)] pt-6">
              <h2 className="mb-3 text-sm text-[var(--ink-muted)]">
                Learn a line
              </h2>
              <LearnExampleList examples={learnCandidates} />
            </section>
          ) : null}
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
        <RetrieveQueue cards={dueCards} onDone={goNext} />
      ) : null}

      {step === "fluency" ? (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-[var(--ink-muted)]">
            Replay a known text at full speed. No lookup.
          </p>
          {fluency?.audioUrl ? (
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
          )}
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
