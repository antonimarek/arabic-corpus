import {
  assessImportItem,
  normalizeImportItem,
  vocabGlosses,
  type ImportItem,
} from "@/lib/import/bundle";
import { blankToNull, normalizeTagNames } from "@/lib/form";
import { citationSlotForPos } from "@/lib/citation";

import type {
  ExampleWriteInput,
  StructureWriteInput,
  TextWriteInput,
  VocabularyWriteInput,
} from "./write";

export type MappedWrite =
  | { type: "vocabulary"; input: VocabularyWriteInput }
  | { type: "example"; input: ExampleWriteInput }
  | { type: "structure"; input: StructureWriteInput }
  | { type: "text"; input: TextWriteInput };

export function mapImportItem(item: ImportItem): MappedWrite | { error: string } {
  const normalized = normalizeImportItem(item);
  const assessment = assessImportItem(normalized);
  if (!assessment.ok) {
    return { error: assessment.error };
  }

  const tags = normalizeTagNames(normalized.tags ?? []);
  const notes = blankToNull(normalized.notes);
  const transliteration = blankToNull(normalized.transliteration);
  const translation = blankToNull(normalized.translation);

  if (assessment.type === "vocabulary") {
    const slot = citationSlotForPos(normalized.part_of_speech);
    return {
      type: "vocabulary",
      input: {
        arabic: normalized.arabic!.trim(),
        transliteration,
        part_of_speech: blankToNull(normalized.part_of_speech),
        notes,
        root: blankToNull(normalized.root),
        pairArabic:
          slot === "plural"
            ? blankToNull(normalized.plural)
            : slot === "present_3ms"
              ? blankToNull(normalized.present)
              : null,
        senses: vocabGlosses(normalized).map((gloss) => ({
          gloss: gloss.text,
          lang: gloss.lang || "en",
        })),
        tags,
      },
    };
  }

  if (assessment.type === "example") {
    return {
      type: "example",
      input: {
        arabic: normalized.arabic!.trim(),
        translation,
        transliteration,
        notes,
        tags,
      },
    };
  }

  if (assessment.type === "structure") {
    return {
      type: "structure",
      input: {
        name: normalized.name!.trim(),
        arabic_form: blankToNull(normalized.arabic_form),
        transliteration,
        meaning: blankToNull(normalized.meaning),
        explanation: blankToNull(normalized.explanation),
        notes,
        tags,
      },
    };
  }

  return {
    type: "text",
    input: {
      title: normalized.title!.trim(),
      arabic: normalized.arabic!.trim(),
      translation,
      source: blankToNull(normalized.source),
      occurred_on: blankToNull(normalized.occurred_on),
      notes,
      tags,
    },
  };
}
