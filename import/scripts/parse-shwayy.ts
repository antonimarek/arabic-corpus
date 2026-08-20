#!/usr/bin/env npx tsx
/**
 * Parse a local Shwayy ‘An Haali PDF into ImportBundle JSON.
 * Output is gitignored. Do not commit the PDF or the JSON.
 *
 *   npx tsx import/scripts/parse-shwayy.ts --pdf /path/to/book.pdf --out raw/shwayy-an-haali.json
 *   npx tsx import/scripts/parse-shwayy.ts --pdf /path/to/book.pdf --glossary-out raw/shwayy-glossary.json
 */

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  assertShwayyBundle,
  assertShwayyGlossaryBundle,
  buildShwayyBundle,
  buildShwayyGlossaryBundle,
} from "../../src/lib/import/parsers/shwayy";

function usage(): never {
  console.error(`Usage:
  npx tsx import/scripts/parse-shwayy.ts --pdf <book.pdf> [--out raw/shwayy-an-haali.json]
  npx tsx import/scripts/parse-shwayy.ts --pdf <book.pdf> --glossary-out raw/shwayy-glossary.json
`);
  process.exit(1);
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function pdfText(
  pdf: string,
  from: number,
  to: number,
  layout = false,
): string {
  const args = layout
    ? ["-layout", "-f", String(from), "-l", String(to), pdf, "-"]
    : ["-f", String(from), "-l", String(to), pdf, "-"];
  return execFileSync("pdftotext", args, {
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

function findGlossaryBodyEnd(pdf: string, appendixStart: number): number {
  const from = Math.max(1, appendixStart - 40);
  for (let page = from; page < appendixStart; page += 1) {
    const text = pdfText(pdf, page, page);
    if (
      text.includes("Levantine Colloquial Arabic (LCA) is a spoken dialect") ||
      text.includes("Appendix A: Pronunciation")
    ) {
      return page - 1;
    }
  }
  return appendixStart - 1;
}

function findGlossaryBodyStart(pdf: string, glossaryEnd: number): number {
  const to = Math.min(30, glossaryEnd);
  for (let page = 8; page <= to; page += 1) {
    const text = pdfText(pdf, page, page);
    if (text.includes("شو اسمك؟") && /ma3rūf|ma3ruf/i.test(text)) {
      return page;
    }
  }
  return 10;
}

async function writeJson(outPath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) usage();
  const pdfArg = argValue(args, "--pdf");
  if (!pdfArg) usage();
  const outArg = argValue(args, "--out") ?? "raw/shwayy-an-haali.json";
  const glossaryOutArg = argValue(args, "--glossary-out");
  const skipTexts = args.includes("--glossary-only");

  const pdf = path.isAbsolute(pdfArg) ? pdfArg : path.join(process.cwd(), pdfArg);
  const outPath = path.isAbsolute(outArg) ? outArg : path.join(process.cwd(), outArg);

  const pages = pageCount(pdf);
  const appendixStart = findAppendixStart(pdf, pages);

  if (!skipTexts) {
    const toc = pdfText(pdf, 1, 8);
    const english = pdfText(pdf, 8, Math.max(8, appendixStart - 1));
    const appendix = pdfText(pdf, appendixStart, pages);

    const bundle = buildShwayyBundle({ appendix, english, toc });
    assertShwayyBundle(bundle);

    await writeJson(outPath, bundle);

    const withTranslation = bundle.items.filter((item) => item.translation).length;
    console.log(
      `Wrote ${bundle.items.length} texts to ${path.relative(process.cwd(), outPath) || outPath}`,
    );
    console.log(`Appendix C starts at PDF page ${appendixStart}.`);
    console.log(`${withTranslation} texts have aligned English.`);
  }

  if (glossaryOutArg) {
    const glossaryEnd = findGlossaryBodyEnd(pdf, appendixStart);
    const glossaryStart = findGlossaryBodyStart(pdf, glossaryEnd);
    const glossaryRaw = pdfText(pdf, glossaryStart, glossaryEnd, true);
    const glossaryBundle = buildShwayyGlossaryBundle(glossaryRaw);
    assertShwayyGlossaryBundle(glossaryBundle);

    const glossaryPath = path.isAbsolute(glossaryOutArg)
      ? glossaryOutArg
      : path.join(process.cwd(), glossaryOutArg);
    await writeJson(glossaryPath, glossaryBundle);
    console.log(
      `Wrote ${glossaryBundle.items.length} glossary vocab items to ${path.relative(process.cwd(), glossaryPath) || glossaryPath}`,
    );
    console.log(
      `Glossary body PDF pages ${glossaryStart}–${glossaryEnd} (layout). Review on /import.`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
