import { notFound } from "next/navigation";

import { Suspense } from "react";

import { TextDetailClient } from "@/components/text-detail-client";
import { TextDetailSkeleton } from "@/components/text-detail-skeleton";
import {
  fetchTextDetail,
  fetchTextShell,
  type TextDetailPayload,
} from "@/lib/text-detail";
import { createClient } from "@/lib/supabase/server";

type TextPageProps = {
  params: Promise<{ id: string }>;
};

async function TextDetailContent({
  id,
  detailPromise,
}: {
  id: string;
  detailPromise: Promise<TextDetailPayload>;
}) {
  let initialData: TextDetailPayload | null = null;
  let loadError: string | null = null;
  try {
    initialData = await detailPromise;
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Could not load text.";
  }

  if (!initialData && loadError === "Text not found") {
    notFound();
  }
  if (loadError || !initialData) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        {loadError ?? "Could not load text."}
      </p>
    );
  }

  return <TextDetailClient textId={id} initialData={initialData} />;
}

export default async function TextDetailPage({ params }: TextPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const detailPromise = fetchTextDetail(supabase, id);

  let shell: Awaited<ReturnType<typeof fetchTextShell>> = null;
  try {
    shell = await fetchTextShell(supabase, id);
  } catch (error) {
    return (
      <p className="text-sm text-[var(--danger)]" role="alert">
        {error instanceof Error ? error.message : "Could not load text."}
      </p>
    );
  }

  if (!shell) {
    notFound();
  }

  return (
    <Suspense fallback={<TextDetailSkeleton shell={shell} />}>
      <TextDetailContent id={id} detailPromise={detailPromise} />
    </Suspense>
  );
}
