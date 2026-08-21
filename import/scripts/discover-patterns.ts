#!/usr/bin/env npx tsx
/**
 * Deterministic pattern candidate discovery (middle doubling v2, pair-first).
 *
 * Usage:
 *   npm run discover:patterns -- --owner-email you@example.com
 *   npm run discover:patterns -- --owner-id <uuid> --dry-run
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (never commit it).
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { runPatternDiscover } from "../../src/lib/pattern-discover/run";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function usage(): never {
  console.error(`Usage:
  npm run discover:patterns -- --owner-email <email>
  npm run discover:patterns -- --owner-id <uuid> [--dry-run]
`);
  process.exit(1);
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) usage();

  const ownerEmail = argValue(args, "--owner-email");
  const ownerId = argValue(args, "--owner-id");
  const dryRun = args.includes("--dry-run");

  if (!ownerEmail && !ownerId) usage();

  const result = await runPatternDiscover({
    ownerEmail,
    ownerId,
    dryRun,
  });

  console.log("--- pattern discover (middle_doubling v2, pair-first) ---");
  console.log(`owner:                 ${result.ownerId}`);
  console.log(`vocab scanned:         ${result.scanned}`);
  console.log(`pairs found:           ${result.pairsFound}`);
  console.log(`form_ii_like_unpaired: ${result.unpairedFormIiLike}`);
  console.log(`drafts (suggestions):  ${result.drafts}`);
  console.log(`skipped linked:        ${result.skippedLinked}`);
  console.log(`skipped existing:      ${result.skippedExisting}`);
  console.log(
    dryRun
      ? `would dismiss orphans: ${result.dismissedOrphans}`
      : `dismissed orphans:     ${result.dismissedOrphans}`,
  );
  console.log(
    dryRun
      ? `would insert:          ${result.drafts - result.skippedLinked - result.skippedExisting}`
      : `inserted/upserted:     ${result.inserted}`,
  );
  if (result.samples.length > 0) {
    console.log("\nSamples:");
    for (const sample of result.samples) {
      console.log(
        `  [${sample.confidence}] ${sample.pairs.join(" · ")} — ${sample.reasoning}`,
      );
    }
  } else if (result.pairsFound < 2) {
    console.log(
      "\nNot enough evidence to suggest a pattern (≥2 independent pairs required).",
    );
    if (result.unpairedFormIiLike > 0) {
      console.log(
        `${result.unpairedFormIiLike} Form II-like word(s) in vocab without a Form I base pair — diagnostic only, not a suggestion.`,
      );
    }
  } else {
    console.log("\nNo new candidates to write.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
