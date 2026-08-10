#!/usr/bin/env npx tsx
/**
 * Deterministic import CLI.
 * Usage:
 *   npm run import -- --file raw/data.csv --config import/configs/csv-example.example.json --type csv
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { runImport, type ImportSourceType } from "../../src/lib/import/pipeline";

function usage(): never {
  console.error(`Usage:
  npm run import -- --file <path> --config <mapping.json> --type <csv|xlsx|anki-csv>

Options:
  --file      Path under raw/ or absolute path
  --config    Column mapping JSON
  --type      csv | xlsx | anki-csv
`);
  process.exit(1);
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) usage();

  const fileArg = argValue(args, "--file");
  const configArg = argValue(args, "--config");
  const typeArg = argValue(args, "--type") as ImportSourceType | undefined;

  if (!fileArg || !configArg || !typeArg) usage();
  if (typeArg !== "csv" && typeArg !== "xlsx" && typeArg !== "anki-csv") {
    console.error(`Unknown type: ${typeArg}`);
    usage();
  }

  const filePath = path.isAbsolute(fileArg)
    ? fileArg
    : path.join(process.cwd(), fileArg);
  const configPath = path.isAbsolute(configArg)
    ? configArg
    : path.join(process.cwd(), configArg);

  const content = await readFile(filePath);
  const mapping = JSON.parse(await readFile(configPath, "utf8"));

  const result = await runImport({
    filePath,
    fileName: path.relative(process.cwd(), filePath) || path.basename(filePath),
    content,
    sourceType: typeArg,
    mapping,
    mappingConfigPath: path.relative(process.cwd(), configPath),
  });

  console.log(JSON.stringify(result.meta.recordCounts, null, 2));
  console.log(`Staging: import/staging/${result.meta.importRunId}`);
  console.log(`Report:  import/reports/${result.meta.importRunId}/report.md`);
  if (result.meta.errors.length > 0) {
    console.error(`${result.meta.errors.length} parse error(s)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
