import { citationSlotForPos, type FormSlot } from "@/lib/citation";
import type { VocabularyWriteInput } from "@/lib/corpus/write";

export type ExistingVocabularyState = {
  id: string;
  arabic: string;
  transliteration: string | null;
  part_of_speech: string | null;
  notes: string | null;
  root: string | null;
  present: string | null;
  plural: string | null;
  glosses: { gloss: string; lang: string }[];
  tags: string[];
};

export type VocabEnrichPatch = {
  transliteration?: string;
  part_of_speech?: string;
  notes?: string;
  root?: string;
  pairSlot?: FormSlot;
  pairArabic?: string;
  sensesToAdd: { gloss: string; lang: string }[];
  tags: string[];
};

export type VocabEnrichPlan = {
  hasChanges: boolean;
  patch: VocabEnrichPatch;
  filledFields: string[];
};

function blank(value: string | null | undefined): boolean {
  return !value?.trim();
}

function glossKey(gloss: string, lang: string): string {
  return `${lang.trim().toLowerCase()}\0${gloss.trim().toLowerCase()}`;
}

/**
 * Fill only absent fields on an existing vocabulary row.
 * Never overwrites non-empty scalars or existing citation forms.
 */
export function planVocabEnrich(
  existing: ExistingVocabularyState,
  incoming: VocabularyWriteInput,
): VocabEnrichPlan {
  const filledFields: string[] = [];
  const patch: VocabEnrichPatch = {
    sensesToAdd: [],
    tags: [...existing.tags],
  };

  if (blank(existing.transliteration) && incoming.transliteration?.trim()) {
    patch.transliteration = incoming.transliteration.trim();
    filledFields.push("transliteration");
  }
  if (blank(existing.part_of_speech) && incoming.part_of_speech?.trim()) {
    patch.part_of_speech = incoming.part_of_speech.trim();
    filledFields.push("part_of_speech");
  }
  if (blank(existing.notes) && incoming.notes?.trim()) {
    patch.notes = incoming.notes.trim();
    filledFields.push("notes");
  }
  if (blank(existing.root) && incoming.root?.trim()) {
    patch.root = incoming.root.trim();
    filledFields.push("root");
  }

  const mergedPos =
    patch.part_of_speech ?? existing.part_of_speech ?? incoming.part_of_speech;
  const slot = citationSlotForPos(mergedPos);
  if (slot && incoming.pairArabic?.trim()) {
    const existingPair =
      slot === "present_3ms" ? existing.present : existing.plural;
    if (blank(existingPair)) {
      patch.pairSlot = slot;
      patch.pairArabic = incoming.pairArabic.trim();
      filledFields.push(slot === "present_3ms" ? "present" : "plural");
    }
  }

  const seen = new Set(
    existing.glosses.map((sense) => glossKey(sense.gloss, sense.lang)),
  );
  for (const sense of incoming.senses) {
    const key = glossKey(sense.gloss, sense.lang);
    if (!sense.gloss.trim() || seen.has(key)) continue;
    seen.add(key);
    patch.sensesToAdd.push({
      gloss: sense.gloss.trim(),
      lang: sense.lang.trim() || "en",
    });
  }
  if (patch.sensesToAdd.length > 0) {
    filledFields.push("glosses");
  }

  const tagSeen = new Set(existing.tags.map((tag) => tag.toLowerCase()));
  let tagsChanged = false;
  for (const tag of incoming.tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (tagSeen.has(key)) continue;
    tagSeen.add(key);
    patch.tags.push(trimmed);
    tagsChanged = true;
  }
  if (tagsChanged) {
    filledFields.push("tags");
  }

  return {
    hasChanges: filledFields.length > 0,
    patch,
    filledFields,
  };
}
