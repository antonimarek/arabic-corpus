"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { deleteText } from "@/app/(app)/texts/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ExampleList } from "@/components/example-list";
import { FocusTargetStrip } from "@/components/focus-target-strip";
import { TextAudioField } from "@/components/text-audio-field";
import { TextDetailSkeleton } from "@/components/text-detail-skeleton";
import { writeLastText } from "@/lib/prefs";
import { createClient } from "@/lib/supabase/client";
import {
  readTextDetailCache,
  writeTextDetailCache,
} from "@/lib/text-detail-cache";
import {
  fetchTextDetail,
  fetchTextKnownLinks,
  textKnownLinksQueryKey,
  textQueryKey,
} from "@/lib/text-detail";
import type { TextDetailPayload, TextShell } from "@/lib/text-detail";
import { lineHref } from "@/lib/text-lines";

const LessonTextDetail = dynamic(
  () =>
    import("@/components/lesson-text-detail").then((mod) => mod.LessonTextDetail),
  {
    loading: () => (
      <p className="text-sm text-[var(--ink-muted)]">Loading lesson…</p>
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

const STALE_MS = 5 * 60 * 1000;

export function TextDetailClient({
  textId,
  shell,
}: {
  textId: string;
  shell: TextShell;
}) {
  const queryClient = useQueryClient();
  const cached = useMemo(() => {
    return (
      queryClient.getQueryData<TextDetailPayload>(textQueryKey(textId)) ??
      readTextDetailCache(textId)
    );
  }, [queryClient, textId]);

  const {
    data,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: textQueryKey(textId),
    queryFn: async () => {
      const detail = await fetchTextDetail(createClient(), textId);
      writeTextDetailCache(detail);
      return detail;
    },
    initialData: cached,
    staleTime: STALE_MS,
  });

  const text = data;
  const focusIds = useMemo(
    () => new Set((text?.focus ?? []).map((row) => row.id)),
    [text?.focus],
  );

  const { data: knownLinks = text?.knownLinks ?? [] } = useQuery({
    queryKey: textKnownLinksQueryKey(textId),
    queryFn: () =>
      fetchTextKnownLinks(createClient(), text!.arabic, focusIds),
    enabled: Boolean(text?.arabic),
    staleTime: STALE_MS,
  });

  useEffect(() => {
    if (!text) return;
    writeLastText({ id: text.id, title: text.title });
  }, [text]);

  if (!text && isPending) {
    return <TextDetailSkeleton shell={shell} />;
  }

  if (isError || !text) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        {error instanceof Error ? error.message : "Could not load text."}
      </p>
    );
  }

  const isLesson = text.tags.includes("lesson");
  const display = { ...text, knownLinks };

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

      <FocusTargetStrip textId={text.id} focus={text.focus} />

      <TextAudioField textId={text.id} hasAudio={Boolean(text.audioPath)} />

      {isLesson ? (
        <LessonTextDetail text={display} />
      ) : (
        <TextLineReader
          textId={text.id}
          arabic={text.arabic}
          translation={text.translation}
          links={text.links}
          knownLinks={knownLinks}
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
      )}

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
            notes: example.notes,
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
