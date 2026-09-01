import { notFound } from "next/navigation";

import { Suspense } from "react";

import { TextDetailClient } from "@/components/text-detail-client";
import { fetchTextDetail } from "@/lib/text-detail";
import { createClient } from "@/lib/supabase/server";

type TextPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TextDetailPage({ params }: TextPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  let initialData: Awaited<ReturnType<typeof fetchTextDetail>> | null = null;
  let loadError: string | null = null;
  try {
    initialData = await fetchTextDetail(supabase, id);
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

  return (
    <Suspense fallback={<p className="text-sm text-[var(--ink-muted)]">Loading…</p>}>
      <TextDetailClient textId={id} initialData={initialData} />
    </Suspense>
  );
}
