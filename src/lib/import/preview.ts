import {
  assessImportItem,
  hrefForEntity,
  type ImportDecision,
  type ImportDecisions,
  type ImportItem,
  type ImportItemType,
} from "./bundle";

export type PreviewMatchStatus = "new" | "exact_duplicate" | "invalid";

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
};

export function buildPreviewRow(
  index: number,
  item: ImportItem,
  existingId: string | null,
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

  if (existingId) {
    return {
      index,
      item,
      matchStatus: "exact_duplicate",
      defaultDecision: "skip",
      decision: stored ?? "skip",
      existingId,
      existingHref: hrefForEntity(assessment.type, existingId),
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

export function resolveDecision(
  decisions: ImportDecisions,
  index: number,
  defaultDecision: ImportDecision,
): ImportDecision {
  return decisions[String(index)] ?? defaultDecision;
}
