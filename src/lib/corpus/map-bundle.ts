import {
  assessImportItem,
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
  const assessment = assessImportItem(item);
  if (!assessment.ok) {
    return { error: assessment.error };
  }

  const tags = normalizeTagNames(item.tags ?? []);
  const notes = blankToNull(item.notes);
  const transliteration = blankToNull(item.transliteration);
  const translation = blankToNull(item.translation);

  if (assessment.type === "vocabulary") {
    const slot = citationSlotForPos(item.part_of_speech);
    return {
      type: "vocabulary",
      input: {
        arabic: item.arabic!.trim(),
        transliteration,
        part_of_speech: blankToNull(item.part_of_speech),
        notes,
        root: blankToNull(item.root),
        pairArabic:
          slot === "plural"
            ? blankToNull(item.plural)
            : slot === "present_3ms"
              ? blankToNull(item.present)
              : null,
        senses: vocabGlosses(item).map((gloss) => ({
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
        arabic: item.arabic!.trim(),
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
        name: item.name!.trim(),
        arabic_form: blankToNull(item.arabic_form),
        transliteration,
        meaning: blankToNull(item.meaning),
        explanation: blankToNull(item.explanation),
        notes,
        tags,
      },
    };
  }

  return {
    type: "text",
    input: {
      title: item.title!.trim(),
      arabic: item.arabic!.trim(),
      translation,
      source: blankToNull(item.source),
      occurred_on: blankToNull(item.occurred_on),
      notes,
      tags,
    },
  };
}
