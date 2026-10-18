import { embedDocuments, isEmbeddingConfigured } from "@/lib/embeddings";
import type { CorpusClient } from "@/lib/corpus/write";
import type { ImportRunCounts } from "@/lib/import/bundle";

function packText(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join("\n").trim();
}

/** Embed rows created/updated by an import commit. Best-effort; never throws. */
export async function embedImportCreated(
  supabase: CorpusClient,
  counts: ImportRunCounts,
): Promise<void> {
  if (!isEmbeddingConfigured()) return;

  const byType = {
    texts: [] as string[],
    examples: [] as string[],
    vocabulary: [] as string[],
    structures: [] as string[],
  };

  for (const row of [...counts.created, ...counts.updatedItems]) {
    if (row.type === "text") byType.texts.push(row.id);
    else if (row.type === "example") byType.examples.push(row.id);
    else if (row.type === "vocabulary") byType.vocabulary.push(row.id);
    else if (row.type === "structure") byType.structures.push(row.id);
  }

  try {
    if (byType.texts.length > 0) {
      const { data } = await supabase
        .from("texts")
        .select("id, title, arabic, translation")
        .in("id", byType.texts);
      const rows = data ?? [];
      if (rows.length > 0) {
        const embeddings = await embedDocuments(
          rows.map((row) => packText([row.title, row.arabic, row.translation]) || " "),
        );
        await Promise.all(
          rows.map((row, i) =>
            supabase
              .from("texts")
              .update({ embedding: JSON.stringify(embeddings[i]) })
              .eq("id", row.id),
          ),
        );
      }
    }

    if (byType.examples.length > 0) {
      const { data } = await supabase
        .from("examples")
        .select("id, arabic, translation, transliteration, notes")
        .in("id", byType.examples);
      const rows = data ?? [];
      if (rows.length > 0) {
        const embeddings = await embedDocuments(
          rows.map(
            (row) =>
              packText([row.arabic, row.transliteration, row.translation, row.notes]) ||
              " ",
          ),
        );
        await Promise.all(
          rows.map((row, i) =>
            supabase
              .from("examples")
              .update({ embedding: JSON.stringify(embeddings[i]) })
              .eq("id", row.id),
          ),
        );
      }
    }

    if (byType.vocabulary.length > 0) {
      const { data } = await supabase
        .from("vocabulary")
        .select("id, arabic, transliteration, notes")
        .in("id", byType.vocabulary);
      const rows = data ?? [];
      if (rows.length > 0) {
        const embeddings = await embedDocuments(
          rows.map(
            (row) => packText([row.arabic, row.transliteration, row.notes]) || " ",
          ),
        );
        await Promise.all(
          rows.map((row, i) =>
            supabase
              .from("vocabulary")
              .update({ embedding: JSON.stringify(embeddings[i]) })
              .eq("id", row.id),
          ),
        );
      }
    }

    if (byType.structures.length > 0) {
      const { data } = await supabase
        .from("structures")
        .select("id, name, arabic_form, meaning, explanation")
        .in("id", byType.structures);
      const rows = data ?? [];
      if (rows.length > 0) {
        const embeddings = await embedDocuments(
          rows.map(
            (row) =>
              packText([row.name, row.arabic_form, row.meaning, row.explanation]) ||
              " ",
          ),
        );
        await Promise.all(
          rows.map((row, i) =>
            supabase
              .from("structures")
              .update({ embedding: JSON.stringify(embeddings[i]) })
              .eq("id", row.id),
          ),
        );
      }
    }
  } catch {
    // Import commit already succeeded; embedding is best-effort.
  }
}
