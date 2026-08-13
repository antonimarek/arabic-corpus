import {
  importBundleSchema,
  importDecisionsSchema,
  type ImportBundle,
  type ImportDecisions,
  type ImportRunCounts,
} from "./bundle";
import type { ImportRun } from "@/types/database";

export function readBundle(run: ImportRun): ImportBundle {
  return importBundleSchema.parse(run.bundle);
}

export function readDecisions(run: ImportRun): ImportDecisions {
  const parsed = importDecisionsSchema.safeParse(run.decisions);
  return parsed.success ? parsed.data : {};
}

export function readCounts(run: ImportRun): ImportRunCounts | null {
  if (!run.counts || typeof run.counts !== "object" || Array.isArray(run.counts)) {
    return null;
  }
  const raw = run.counts as Record<string, unknown>;
  if (typeof raw.inserted !== "number") return null;
  return raw as ImportRunCounts;
}
