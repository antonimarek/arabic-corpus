"use server";

import { revalidatePath } from "next/cache";

import { embedDocuments, isEmbeddingConfigured } from "@/lib/embeddings";
import { requireUserId } from "@/lib/require-user";

function packText(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join("\n").trim();
}

export type ReindexResult = {
  error?: string;
  updated?: number;
  skipped?: boolean;
};

export async function reindexEmbeddings(): Promise<ReindexResult> {
  if (!isEmbeddingConfigured()) {
    return {
      skipped: true,
      error:
        "Set OPENAI_API_KEY (or EMBEDDING_API_KEY) to enable semantic search indexing.",
    };
  }

  const { supabase } = await requireUserId();
  let updated = 0;

  {
    const { data, error } = await supabase
      .from("texts")
      .select("id, title, arabic, translation");
    if (error) return { error: error.message };
    const rows = data ?? [];
    for (let i = 0; i < rows.length; i += 64) {
      const chunk = rows.slice(i, i + 64);
      const embeddings = await embedDocuments(
        chunk.map((row) => packText([row.title, row.arabic, row.translation]) || " "),
      );
      for (let j = 0; j < chunk.length; j += 1) {
        const { error: updateError } = await supabase
          .from("texts")
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq("id", chunk[j].id);
        if (updateError) return { error: updateError.message };
        updated += 1;
      }
    }
  }

  {
    const { data, error } = await supabase
      .from("examples")
      .select("id, arabic, translation, transliteration");
    if (error) return { error: error.message };
    const rows = data ?? [];
    for (let i = 0; i < rows.length; i += 64) {
      const chunk = rows.slice(i, i + 64);
      const embeddings = await embedDocuments(
        chunk.map(
          (row) =>
            packText([row.arabic, row.transliteration, row.translation]) || " ",
        ),
      );
      for (let j = 0; j < chunk.length; j += 1) {
        const { error: updateError } = await supabase
          .from("examples")
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq("id", chunk[j].id);
        if (updateError) return { error: updateError.message };
        updated += 1;
      }
    }
  }

  {
    const { data, error } = await supabase
      .from("vocabulary")
      .select("id, arabic, transliteration, notes");
    if (error) return { error: error.message };
    const rows = data ?? [];
    for (let i = 0; i < rows.length; i += 64) {
      const chunk = rows.slice(i, i + 64);
      const embeddings = await embedDocuments(
        chunk.map(
          (row) =>
            packText([row.arabic, row.transliteration, row.notes]) || " ",
        ),
      );
      for (let j = 0; j < chunk.length; j += 1) {
        const { error: updateError } = await supabase
          .from("vocabulary")
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq("id", chunk[j].id);
        if (updateError) return { error: updateError.message };
        updated += 1;
      }
    }
  }

  {
    const { data, error } = await supabase
      .from("structures")
      .select("id, name, arabic_form, meaning, explanation");
    if (error) return { error: error.message };
    const rows = data ?? [];
    for (let i = 0; i < rows.length; i += 64) {
      const chunk = rows.slice(i, i + 64);
      const embeddings = await embedDocuments(
        chunk.map(
          (row) =>
            packText([
              row.name,
              row.arabic_form,
              row.meaning,
              row.explanation,
            ]) || " ",
        ),
      );
      for (let j = 0; j < chunk.length; j += 1) {
        const { error: updateError } = await supabase
          .from("structures")
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq("id", chunk[j].id);
        if (updateError) return { error: updateError.message };
        updated += 1;
      }
    }
  }

  revalidatePath("/");
  return { updated };
}
