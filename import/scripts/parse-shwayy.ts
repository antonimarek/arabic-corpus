#!/usr/bin/env npx tsx
/**
 * Parse a local Shwayy ‘An Haali PDF into ImportBundle JSON.
 * Output is gitignored. Do not commit the PDF or the JSON.
 *
 *   npx tsx import/scripts/parse-shwayy.ts --pdf /path/to/book.pdf --out raw/shwayy-an-haali.json
 */

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  assertShwayyBundle,
  buildShwayyBundle,
} from "../../src/lib/import/parsers/shwayy";

function usage(): never {
  console.error(`Usage:
  npx tsx import/scripts/parse-shwayy.ts --pdf <book.pdf> [--out raw/shwayy-an-haali.json]
`);
  process.exit(1);
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function pdfText(pdf: string, from: number, to: number): string {
  return execFileSync("pdftotext", ["-f", String(from), "-l", String(to), pdf, "-"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function pageCount(pdf: string): number {
  const info = execFileSync("pdfinfo", [pdf], { encoding: "utf8" });
  const match = info.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error("pdfinfo did not report Pages.");
  return Number(match[1]);
}

function findAppendixStart(pdf: string, pages: number): number {
  const from = Math.max(1, pages - 50);
  for (let page = from; page <= pages; page += 1) {
    const text = pdfText(pdf, page, page);
    if (text.includes("شو اسمك؟") && text.includes("هدى")) return page;
  }
  throw new Error("Could not find Appendix C (شو اسمك؟).");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) usage();
  const pdfArg = argValue(args, "--pdf");
  if (!pdfArg) usage();
  const outArg = argValue(args, "--out") ?? "raw/shwayy-an-haali.json";

  const pdf = path.isAbsolute(pdfArg) ? pdfArg : path.join(process.cwd(), pdfArg);
  const outPath = path.isAbsolute(outArg) ? outArg : path.join(process.cwd(), outArg);

  const pages = pageCount(pdf);
  const appendixStart = findAppendixStart(pdf, pages);
  const toc = pdfText(pdf, 1, 8);
  const english = pdfText(pdf, 8, Math.max(8, appendixStart - 1));
  const appendix = pdfText(pdf, appendixStart, pages);

  const bundle = buildShwayyBundle({ appendix, english, toc });
  assertShwayyBundle(bundle);

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  const withTranslation = bundle.items.filter((item) => item.translation).length;
  console.log(
    `Wrote ${bundle.items.length} texts to ${path.relative(process.cwd(), outPath) || outPath}`,
  );
  console.log(`Appendix C starts at PDF page ${appendixStart}.`);
  console.log(`${withTranslation} texts have aligned English.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
