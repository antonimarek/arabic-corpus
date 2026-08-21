import {
  assessImportItem,
  hrefForEntity,
  type ImportDecision,
  type ImportDecisions,
  type ImportItem,
  type ImportItemType,
} from "./bundle";
import { planVocabEnrich } from "./enrich";
import { mapImportItem } from "@/lib/corpus/map-bundle";
import type { ExistingMatch } from "./match";

export type PreviewMatchStatus =
  | "new"
  | "exact_duplicate"
  | "enrichable"
  | "invalid";

export type PreviewRow = {
  index: number;
  item: ImportItem;
  matchStatus: PreviewMatchStatus;
  defaultDecision: ImportDecision;
  decision: ImportDecision;
  error?: string;
  existingId?: string;
  existingHref?: string;
  type?: ImportItemType;
  enrichFields?: string[];
};

export function buildPreviewRow(
  index: number,
  item: ImportItem,
  existing: ExistingMatch | null,
  stored?: ImportDecision,
): PreviewRow {
  const assessment = assessImportItem(item);
  if (!assessment.ok) {
    return {
      index,
      item,
      matchStatus: "invalid",
      defaultDecision: "skip",
      decision: stored ?? "skip",
      error: assessment.error,
    };
  }

  if (existing) {
    const enrichFields = enrichableFields(item, existing);
    if (enrichFields && enrichFields.length > 0) {
      return {
        index,
        item,
        matchStatus: "enrichable",
        defaultDecision: "keep",
        decision: stored ?? "keep",
        existingId: existing.id,
        existingHref: hrefForEntity(assessment.type, existing.id),
        type: assessment.type,
        enrichFields,
      };
    }

    return {
      index,
      item,
      matchStatus: "exact_duplicate",
      defaultDecision: "skip",
      decision: stored ?? "skip",
      existingId: existing.id,
      existingHref: hrefForEntity(assessment.type, existing.id),
      type: assessment.type,
    };
  }

  return {
    index,
    item,
    matchStatus: "new",
    defaultDecision: "keep",
    decision: stored ?? "keep",
    type: assessment.type,
  };
}

function enrichableFields(
  item: ImportItem,
  existing: ExistingMatch,
): string[] | null {
  if (!existing.vocabulary || item.type !== "vocabulary") {
    return null;
  }
  const mapped = mapImportItem(item);
  if ("error" in mapped || mapped.type !== "vocabulary") {
    return null;
  }
  return planVocabEnrich(existing.vocabulary, mapped.input).filledFields;
}

export function resolveDecision(
  decisions: ImportDecisions,
  index: number,
  defaultDecision: ImportDecision,
): ImportDecision {
  return decisions[String(index)] ?? defaultDecision;
}
