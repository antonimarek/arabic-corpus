"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { LessonDialogueReader } from "@/components/lesson-dialogue-reader";
import { LessonExportActions } from "@/components/lesson-export-actions";
import { LessonStudyPack } from "@/components/lesson-study-pack";
import { LessonTextTabs, type LessonTextTab } from "@/components/lesson-text-tabs";
import { TextAudioPlayer } from "@/components/text-audio-player";
import { useTextAudioController } from "@/lib/text-audio-controller";
import { parseLineHash, splitTextLines } from "@/lib/text-lines";
import type { TextDetailPayload } from "@/lib/text-detail";

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

  if (!text.studyPack) {
    return null;
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
        studyPack={text.studyPack}
        title={text.title}
        source={text.source}
        occurredOn={text.occurred_on}
        textId={text.id}
        lineStartsMs={text.audioLineStartsMs}
      />

      {activeTab === "study" ? (
        <LessonStudyPack
          textId={text.id}
          studyPack={text.studyPack}
          lineStartsMs={text.audioLineStartsMs}
          audioController={audioController}
        />
      ) : (
        <LessonDialogueReader
          textId={text.id}
          arabic={text.arabic}
          links={text.links}
          knownLinks={text.knownLinks}
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
