"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { LessonTextTabs, type LessonTextTab } from "@/components/lesson-text-tabs";
import { TextAudioPlayer } from "@/components/text-audio-player";
import { createClient } from "@/lib/supabase/client";
import { useTextAudioController } from "@/lib/text-audio-controller";
import { parseLineHash, splitTextLines } from "@/lib/text-lines";
import {
  fetchTextStudyExtras,
  textStudyQueryKey,
  type TextDetailPayload,
} from "@/lib/text-detail";
import { isStudyPackV2 } from "@/lib/transcribe/study-pack";

const LessonAiStudyPlan = dynamic(
  () =>
    import("@/components/lesson-ai-study-plan").then((mod) => mod.LessonAiStudyPlan),
  {
    loading: () => (
      <p className="text-sm text-[var(--ink-muted)]">Loading study plan…</p>
    ),
  },
);
const LessonStudyPack = dynamic(
  () =>
    import("@/components/lesson-study-pack").then((mod) => mod.LessonStudyPack),
  {
    loading: () => (
      <p className="text-sm text-[var(--ink-muted)]">Loading study pack…</p>
    ),
  },
);
const LessonExportActions = dynamic(
  () =>
    import("@/components/lesson-export-actions").then(
      (mod) => mod.LessonExportActions,
    ),
);
const LessonDialogueReader = dynamic(
  () =>
    import("@/components/lesson-dialogue-reader").then(
      (mod) => mod.LessonDialogueReader,
    ),
  {
    loading: () => (
      <p className="text-sm text-[var(--ink-muted)]">Loading dialogue…</p>
    ),
  },
);
const TextLineReader = dynamic(
  () =>
    import("@/components/text-line-reader").then((mod) => mod.TextLineReader),
  {
    loading: () => (
      <p className="text-sm text-[var(--ink-muted)]">Loading text…</p>
    ),
  },
);

type LessonTextDetailProps = {
  text: TextDetailPayload;
};

function parseTab(value: string | null): LessonTextTab {
  return value === "dialogue" ? "dialogue" : "study";
}

export function LessonTextDetail({ text }: LessonTextDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));

  const {
    data: study,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: textStudyQueryKey(text.id),
    queryFn: () => fetchTextStudyExtras(createClient(), text.id),
    staleTime: 5 * 60 * 1000,
  });

  const studyPack = study?.studyPack ?? null;
  const aiStudyPlan = study?.aiStudyPlan ?? null;

  const audioInput = text.audioUrl
    ? {
        url: text.audioUrl,
        durationMs: text.audioDurationMs,
        lineStarts: text.audioLineStartsMs,
      }
    : null;

  const audioController = useTextAudioController(text.id, audioInput);
  const nonEmptyLineCount = useMemo(
    () => splitTextLines(text.arabic).filter((line) => line.trim().length > 0).length,
    [text.arabic],
  );

  const setTab = useCallback(
    (tab: LessonTextTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "study") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      router.replace(query ? `/texts/${text.id}?${query}${hash}` : `/texts/${text.id}${hash}`, {
        scroll: false,
      });
    },
    [router, searchParams, text.id],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const line = parseLineHash(window.location.hash);
    if (line != null && activeTab !== "dialogue") {
      setTab("dialogue");
    }
  }, [activeTab, setTab]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        {audioInput ? (
          <TextAudioPlayer
            audioUrl={audioInput.url}
            controller={audioController}
            nonEmptyLineCount={nonEmptyLineCount}
          />
        ) : null}
        <p className="text-sm text-[var(--ink-muted)]">Loading study…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        {error instanceof Error ? error.message : "Could not load study."}
      </p>
    );
  }

  if (!studyPack) {
    return (
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
        audio={
          text.audioUrl
            ? {
                url: text.audioUrl,
                durationMs: text.audioDurationMs,
                lineStarts: text.audioLineStartsMs,
              }
            : null
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {audioInput ? (
        <TextAudioPlayer
          audioUrl={audioInput.url}
          controller={audioController}
          nonEmptyLineCount={nonEmptyLineCount}
        />
      ) : null}

      <LessonTextTabs activeTab={activeTab} onTabChange={setTab} />

      <LessonExportActions
        arabic={text.arabic}
        studyPack={studyPack}
        title={text.title}
        source={text.source}
        occurredOn={text.occurred_on}
        textId={text.id}
        lineStartsMs={text.audioLineStartsMs}
      />

      {activeTab === "study" ? (
        <>
          <LessonAiStudyPlan textId={text.id} initialContent={aiStudyPlan} />
          <div className="border-t border-[var(--line)] pt-6">
            <h2 className="mb-4 text-sm text-[var(--ink-muted)]">
              From transcript (automatic)
            </h2>
            <LessonStudyPack
              textId={text.id}
              studyPack={studyPack}
              lineStartsMs={text.audioLineStartsMs}
              audioController={audioController}
            />
          </div>
        </>
      ) : (
        <LessonDialogueReader
          textId={text.id}
          arabic={text.arabic}
          fathomArabic={
            isStudyPackV2(studyPack) ? studyPack.fathomArabic ?? null : null
          }
          wisprArabic={
            isStudyPackV2(studyPack) ? studyPack.wisprArabic ?? null : null
          }
          links={text.links}
          examples={text.examples.map((example) => ({
            id: example.id,
            arabic: example.arabic,
            sourceLine: example.source_line,
          }))}
          audioController={audioController}
        />
      )}

      <p className="text-xs text-[var(--ink-muted)]">
        {activeTab === "study"
          ? "Use Dialogue for the full transcript and line lookup."
          : (
            <>
              Back to{" "}
              <button
                type="button"
                className="text-[var(--accent)] hover:underline"
                onClick={() => setTab("study")}
              >
                Study
              </button>{" "}
              for recall cards and weekly plan.
            </>
          )}
      </p>
    </div>
  );
}
