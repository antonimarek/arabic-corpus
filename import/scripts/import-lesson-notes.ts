#!/usr/bin/env npx tsx
/**
 * Import lesson-notes gaps (vocabulary, structures, dialogue texts).
 *
 * Runs an ImportBundle (vocabulary / structure / text) through the same
 * matcher + writers as /import commit, then links each text line as an
 * example (text_id + source_line). Does not create review rows.
 *
 * Usage:
 *   npx tsx import/scripts/import-lesson-notes.ts --bundle <bundle.json> --texts <texts.json> --owner-id <uuid> [--dry-run]
 */

import { existsSync, readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import {
  itemLabel,
  parseImportBundle,
  type ImportItem,
  type ImportRunCounts,
} from "../../src/lib/import/bundle";
import { applyImportProvenance, provenanceFromBundle } from "../../src/lib/import/origin";
import { findExistingMatches } from "../../src/lib/import/match";
import { mapImportItem } from "../../src/lib/corpus/map-bundle";
import { embedImportCreated } from "../../src/lib/import/embed-created";
import { normalizeArabic } from "../../src/lib/import/normalize";
import {
  enrichVocabularyRecord,
  writeExample,
  writeStructure,
  writeText,
  writeVocabulary,
} from "../../src/lib/corpus/write";
import type { Database, Json } from "../../src/types/database";

type TextLines = {
  text: ImportItem;
  examples: Array<{ line: number; arabic: string }>;
};

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const key = t.slice(0, t.indexOf("=")).trim();
    let value = t.slice(t.indexOf("=") + 1).trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

/** Stronger key than search_arabic: also drops tatweel and unifies ؤ/ئ. */
function looseKey(s: string): string {
  return (normalizeArabic(s) ?? "")
    .replace(/ـ/g, "")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  loadEnvLocal();
  const bundlePath = arg("--bundle");
  const textsPath = arg("--texts");
  const ownerId = arg("--owner-id");
  const dryRun = process.argv.includes("--dry-run");
  if (!bundlePath || !textsPath || !ownerId) {
    console.error("Missing --bundle / --texts / --owner-id");
    process.exit(1);
  }

  const texts = JSON.parse(readFileSync(textsPath, "utf8")) as TextLines[];
  const base = JSON.parse(readFileSync(bundlePath, "utf8"));
  base.items = [...base.items, ...texts.map((t) => t.text)];
  const parsed = parseImportBundle(JSON.stringify(base));
  if (!parsed.ok) throw new Error(parsed.error);
  const { origin, value } = provenanceFromBundle(parsed.bundle);
  const bundle = applyImportProvenance(parsed.bundle, origin, value);

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Loose-key guard on top of the exact search_arabic matcher.
  const looseExisting = new Map<string, Set<string>>();
  for (const [table, col] of [
    ["vocabulary", "arabic"],
    ["vocabulary_forms", "arabic"],
    ["structures", "arabic_form"],
    ["examples", "arabic"],
    ["texts", "title"],
  ] as const) {
    const { data, error } = await supabase
      .from(table)
      .select(col)
      .eq("owner_id", ownerId);
    if (error) throw new Error(`${table}: ${error.message}`);
    looseExisting.set(
      table,
      new Set((data ?? []).map((r) => looseKey(String((r as unknown as Record<string, unknown>)[col] ?? "")))),
    );
  }
  const vocabLoose = new Set([
    ...looseExisting.get("vocabulary")!,
    ...looseExisting.get("vocabulary_forms")!,
  ]);
  const { data: titleRows } = await supabase
    .from("texts")
    .select("title")
    .eq("owner_id", ownerId);
  const titles = new Set((titleRows ?? []).map((r) => r.title));

  const existing = await findExistingMatches(supabase, bundle.items);
  const counts: ImportRunCounts = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    created: [],
    updatedItems: [],
    failures: [],
  };
  const textIds = new Map<string, string>();
  const plan = { vocabulary: 0, structure: 0, text: 0, example: 0, skipped: 0 };

  for (const [index, item] of bundle.items.entries()) {
    const match = existing[index];
    const loose = looseKey(item.arabic_form ?? item.arabic ?? "");
    const looseDup =
      (item.type === "vocabulary" && vocabLoose.has(loose)) ||
      (item.type === "structure" && looseExisting.get("structures")!.has(loose)) ||
      (item.type === "text" && titles.has(item.title ?? ""));
    if ((match && !match.vocabulary) || looseDup) {
      counts.skipped += 1;
      plan.skipped += 1;
      if (item.type === "text" && match) textIds.set(item.title!, match.id);
      continue;
    }
    const mapped = mapImportItem(item);
    if ("error" in mapped) {
      counts.failed += 1;
      counts.failures.push({ index, error: mapped.error });
      continue;
    }
    plan[mapped.type] += 1;
    if (dryRun) continue;

    let result;
    if (match?.vocabulary && mapped.type === "vocabulary") {
      const r = await enrichVocabularyRecord(supabase, ownerId, match.vocabulary, mapped.input);
      if ("error" in r) {
        counts.failed += 1;
        counts.failures.push({ index, error: r.error });
      } else if (r.enriched) {
        counts.updated += 1;
        counts.updatedItems.push({ type: "vocabulary", id: r.id, label: itemLabel(item) });
      } else counts.skipped += 1;
      continue;
    }
    if (mapped.type === "vocabulary") {
      result = await writeVocabulary(supabase, ownerId, mapped.input, { allowDuplicate: true });
    } else if (mapped.type === "structure") {
      result = await writeStructure(supabase, ownerId, mapped.input);
    } else if (mapped.type === "text") {
      result = await writeText(supabase, ownerId, mapped.input);
    } else {
      result = await writeExample(supabase, ownerId, mapped.input);
    }
    if ("error" in result) {
      counts.failed += 1;
      counts.failures.push({ index, error: result.error });
      continue;
    }
    counts.inserted += 1;
    counts.created.push({ type: mapped.type, id: result.id, label: itemLabel(item) });
    if (mapped.type === "text") textIds.set(item.title!, result.id);
  }

  // Link text lines as examples, in lesson order.
  const exampleLoose = looseExisting.get("examples")!;
  for (const t of texts) {
    const textId = textIds.get(t.text.title!);
    for (const ex of t.examples) {
      const key = looseKey(ex.arabic);
      if (exampleLoose.has(key)) {
        plan.skipped += 1;
        continue;
      }
      exampleLoose.add(key);
      plan.example += 1;
      if (dryRun || !textId) continue;
      const r = await writeExample(supabase, ownerId, {
        arabic: ex.arabic,
        textId,
        sourceLine: ex.line,
        tags: [...(t.text.tags ?? [])],
      });
      if ("error" in r) {
        counts.failed += 1;
        counts.failures.push({ index: -1, error: `${t.text.title} L${ex.line}: ${r.error}` });
      } else {
        counts.inserted += 1;
        counts.created.push({ type: "example", id: r.id, label: ex.arabic.slice(0, 60) });
      }
    }
  }

  console.log(dryRun ? "DRY RUN plan:" : "Plan executed:", plan);
  if (dryRun) return;

  const { error } = await supabase.from("import_runs").insert({
    owner_id: ownerId,
    source_label: bundle.source?.title ?? "Lesson notes import",
    bundle: bundle as unknown as Json,
    decisions: {} as Json,
    status: "committed",
    counts: counts as unknown as Json,
    committed_at: new Date().toISOString(),
  });
  if (error) console.error("import_runs:", error.message);

  await embedImportCreated(supabase, counts);
  console.log({
    inserted: counts.inserted,
    updated: counts.updated,
    skipped: counts.skipped,
    failed: counts.failed,
    failures: counts.failures.slice(0, 20),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
