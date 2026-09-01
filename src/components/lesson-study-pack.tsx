"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { MixedScriptText } from "@/components/mixed-script-text";
import {
  lineNumberHref,
  parseTimestampLabel,
  timestampLineHref,
} from "@/lib/study-pack-nav";
import type { TextAudioController } from "@/lib/text-audio-controller";
import {
  isStudyPackV2,
  type StudyPack,
  type StudyPackV1,
} from "@/lib/transcribe/study-pack";

type LessonStudyPackProps = {
  textId: string;
  studyPack: StudyPack;
  lineStartsMs: number[] | null;
  audioController?: TextAudioController | null;
};

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-medium text-[var(--ink)]">{children}</h3>
  );
}

function TimestampLink({
  textId,
  label,
  lineStartsMs,
  lineNumber,
  onNavigate,
}: {
  textId: string;
  label: string;
  lineStartsMs: number[] | null;
  lineNumber?: number | null;
  onNavigate?: () => void;
}) {
  const href =
    lineNumber != null
      ? lineNumberHref(textId, lineNumber)
      : timestampLineHref(textId, label, lineStartsMs);
  const display = label.replace(/[\[\]]/g, "");

  if (!href) {
    return (
      <span className="font-mono text-xs text-[var(--ink-muted)]">[{display}]</span>
    );
  }

  return (
    <Link
      href={href}
      className="font-mono text-xs text-[var(--accent)] hover:underline"
      onClick={onNavigate}
    >
      [{display}]
    </Link>
  );
}

function PlayButton({
  label,
  lineStartsMs,
  audioController,
}: {
  label: string;
  lineStartsMs: number[] | null;
  audioController?: TextAudioController | null;
}) {
  if (!audioController) return null;
  const ms = parseTimestampLabel(label);
  if (ms == null) return null;

  return (
    <button
      type="button"
      className="text-xs text-[var(--accent)] hover:underline"
      onClick={() => audioController.playSpan(ms, null)}
    >
      Play
    </button>
  );
}

function RecallCardItem({
  cueEn,
  targetAr,
  timestamp,
  lineNumber,
  textId,
  lineStartsMs,
  audioController,
}: {
  cueEn: string;
  targetAr: string;
  timestamp: string;
  lineNumber: number | null;
  textId: string;
  lineStartsMs: number[] | null;
  audioController?: TextAudioController | null;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <li className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <TimestampLink
          textId={textId}
          label={timestamp}
          lineStartsMs={lineStartsMs}
          lineNumber={lineNumber}
        />
        <PlayButton
          label={timestamp}
          lineStartsMs={lineStartsMs}
          audioController={audioController}
        />
      </div>
      <p
        className="font-arabic text-lg leading-relaxed text-[var(--ink)]"
        lang="ar"
        dir="rtl"
      >
        {targetAr}
      </p>
      <button
        type="button"
        className="mt-2 text-sm text-[var(--accent)] hover:underline"
        onClick={() => setRevealed((open) => !open)}
        aria-expanded={revealed}
      >
        {revealed ? "Hide cue" : "Show cue"}
      </button>
      {revealed ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]" dir="ltr">
          {cueEn}
        </p>
      ) : null}
    </li>
  );
}

function LegacyRecallSection({
  pack,
  textId,
  lineStartsMs,
}: {
  pack: StudyPackV1;
  textId: string;
  lineStartsMs: number[] | null;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {pack.recallPhrases.map((item) => (
        <li
          key={`${item.timestamp}-${item.arabic}`}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3"
        >
          <div className="mb-2">
            <TimestampLink
              textId={textId}
              label={item.timestamp}
              lineStartsMs={lineStartsMs}
            />
          </div>
          <p
            className="font-arabic text-lg leading-relaxed text-[var(--ink)]"
            lang="ar"
            dir="rtl"
          >
            {item.arabic}
          </p>
          <MixedScriptText text={item.context} variant="study" className="mt-2" />
        </li>
      ))}
    </ul>
  );
}

export function LessonStudyPack({
  textId,
  studyPack,
  lineStartsMs,
  audioController,
}: LessonStudyPackProps) {
  const v2 = isStudyPackV2(studyPack);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-[var(--ink-muted)]">
          Weekly practice from this lesson. Tap timestamps to open Dialogue at
          that moment.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeading>This week</SectionHeading>
        <ol className="list-decimal space-y-2 ps-5 text-sm leading-relaxed text-[var(--ink-muted)]">
          {studyPack.weeklyPlan.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeading>
          Recall cards ({v2 ? studyPack.recallCards.length : (studyPack as StudyPackV1).recallPhrases.length})
        </SectionHeading>
        {v2 ? (
          studyPack.recallCards.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">
              No recall cards extracted automatically.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {studyPack.recallCards.map((item) => (
                <RecallCardItem
                  key={`${item.timestamp}-${item.targetAr}`}
                  {...item}
                  textId={textId}
                  lineStartsMs={lineStartsMs}
                  audioController={audioController}
                />
              ))}
            </ul>
          )
        ) : (
          <LegacyRecallSection
            pack={studyPack as StudyPackV1}
            textId={textId}
            lineStartsMs={lineStartsMs}
          />
        )}
      </div>

      {v2 && studyPack.corrections.length > 0 ? (
        <div className="flex flex-col gap-3">
          <SectionHeading>Corrections ({studyPack.corrections.length})</SectionHeading>
          <ul className="flex flex-col gap-4">
            {studyPack.corrections.map((item) => (
              <li
                key={`${item.timestamp}-${item.youSaid.slice(0, 30)}`}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <TimestampLink
                    textId={textId}
                    label={item.timestamp}
                    lineStartsMs={lineStartsMs}
                    lineNumber={item.lineNumber}
                  />
                  <PlayButton
                    label={item.timestamp}
                    lineStartsMs={lineStartsMs}
                    audioController={audioController}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--ink)]">You</p>
                    <MixedScriptText text={item.youSaid} variant="study" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--ink)]">Tutor</p>
                    <MixedScriptText text={item.tutorSaid} variant="study" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {v2 && studyPack.contrasts.length > 0 ? (
        <div className="flex flex-col gap-3">
          <SectionHeading>Contrasts ({studyPack.contrasts.length})</SectionHeading>
          <ul className="flex flex-col gap-4">
            {studyPack.contrasts.map((item) => (
              <li
                key={`${item.a}-${item.b}`}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <p className="text-sm font-medium text-[var(--ink)]">{item.note}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <p className="font-arabic text-lg text-[var(--ink)]" lang="ar" dir="rtl">
                    {item.a}
                  </p>
                  <p className="font-arabic text-lg text-[var(--ink)]" lang="ar" dir="rtl">
                    {item.b}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.timestamps.map((label) => (
                    <TimestampLink
                      key={label}
                      textId={textId}
                      label={label}
                      lineStartsMs={lineStartsMs}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <SectionHeading>
          Confusion moments ({studyPack.confusionMoments.length})
        </SectionHeading>
        {studyPack.confusionMoments.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">None auto-detected.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {studyPack.confusionMoments.map((item) => (
              <li
                key={`${item.timestamp}-${item.student.slice(0, 40)}`}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <TimestampLink
                    textId={textId}
                    label={item.timestamp}
                    lineStartsMs={lineStartsMs}
                    lineNumber={"lineNumber" in item ? item.lineNumber : null}
                  />
                  <PlayButton
                    label={item.timestamp}
                    lineStartsMs={lineStartsMs}
                    audioController={audioController}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-[var(--ink)]">You</p>
                  <MixedScriptText text={item.student} variant="study" />
                </div>
                {item.tutor ? (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-[var(--ink)]">Tutor</p>
                    <MixedScriptText text={item.tutor} variant="study" />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeading>
          Grammar threads ({studyPack.grammarThreads.length})
        </SectionHeading>
        {studyPack.grammarThreads.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">None auto-detected.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {studyPack.grammarThreads.map((thread) => (
              <li
                key={thread.topic}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <p className="text-sm font-medium text-[var(--ink)]">{thread.topic}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {thread.timestamps.map((label) => (
                    <TimestampLink
                      key={label}
                      textId={textId}
                      label={label}
                      lineStartsMs={lineStartsMs}
                    />
                  ))}
                </div>
                <MixedScriptText text={thread.sample} variant="study" className="mt-2" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
