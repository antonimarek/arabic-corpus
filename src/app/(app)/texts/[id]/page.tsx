import { notFound } from "next/navigation";

import { TextDetailClient } from "@/components/text-detail-client";
import { fetchTextShell } from "@/lib/text-detail";
import { createClient } from "@/lib/supabase/server";

type TextPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TextDetailPage({ params }: TextPageProps) {
  const { id } = await params;
  const supabase = await createClient();

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

  return <TextDetailClient textId={id} shell={shell} />;
}
