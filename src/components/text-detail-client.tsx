"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { deleteText } from "@/app/(app)/texts/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ExampleList } from "@/components/example-list";
import { FocusTargetStrip } from "@/components/focus-target-strip";
import { LessonStudyPack } from "@/components/lesson-study-pack";
import { TextAudioField } from "@/components/text-audio-field";
import { TextLineReader } from "@/components/text-line-reader";
import { writeLastText } from "@/lib/prefs";
import { createClient } from "@/lib/supabase/client";
import { fetchTextDetail, textQueryKey } from "@/lib/text-detail";
import type { TextDetailPayload } from "@/lib/text-detail";
import { lineHref } from "@/lib/text-lines";

export function TextDetailClient({
  textId,
  initialData,
}: {
  textId: string;
  initialData: TextDetailPayload;
}) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: textQueryKey(textId),
    queryFn: () => fetchTextDetail(createClient(), textId),
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    queryClient.setQueryData(textQueryKey(textId), initialData);
  }, [initialData, queryClient, textId]);

  const text = data ?? initialData;

  useEffect(() => {
    writeLastText({ id: text.id, title: text.title });
  }, [text.id, text.title]);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-medium text-[var(--ink)]">{text.title}</h1>
          <div className="flex shrink-0 gap-3 text-sm">
            <Link
              href={`/texts/${text.id}/edit`}
              className="text-[var(--accent)] hover:underline"
            >
              Edit
            </Link>
            <ConfirmDelete action={deleteText.bind(null, text.id)} />
          </div>
        </div>
        <p className="text-xs text-[var(--ink-muted)]">
          {[text.source, text.occurred_on, ...text.tags]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <FocusTargetStrip
        textId={text.id}
        focus={text.focus}
        vocabOptions={text.vocabOptions}
      />

      <TextAudioField textId={text.id} hasAudio={Boolean(text.audioPath)} />

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

      {text.studyPack ? (
        <LessonStudyPack
          textId={text.id}
          studyPack={text.studyPack}
          lineStartsMs={text.audioLineStartsMs}
        />
      ) : null}

      {text.notes ? (
        <div className="border-t border-[var(--line)] pt-6">
          <h2 className="mb-3 text-sm text-[var(--ink-muted)]">Notes</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {text.notes}
          </p>
        </div>
      ) : null}

      <section className="border-t border-[var(--line)] pt-6">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-sm text-[var(--ink-muted)]">
            Examples ({text.examples.length})
          </h2>
          <Link
            href={`/examples/new?text=${text.id}`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Add example
          </Link>
        </div>
        <ExampleList
          examples={text.examples.map((example) => ({
            id: example.id,
            arabic: example.arabic,
            translation: example.translation,
            transliteration: example.transliteration,
            sourceTitle:
              example.source_line != null
                ? `Line ${example.source_line}`
                : undefined,
            sourceHref:
              example.source_line != null
                ? lineHref(text.id, example.source_line)
                : undefined,
            vocabHints: example.vocabHints,
          }))}
          emptyMessage="No examples linked to this text yet."
        />
      </section>
    </article>
  );
}
