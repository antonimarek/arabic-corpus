import { describe, expect, it } from "vitest";

import { parseImportBundle } from "@/lib/import/bundle";
import {
  alignSectionTranslations,
  buildShwayyBundle,
  buildShwayyGlossaryBundle,
  parseShwayyAppendix,
  parseShwayyEnglish,
  parseShwayyGlossary,
  parseShwayyToc,
  tidyArabic,
} from "@/lib/import/parsers/shwayy";

const SPEAKER_BLOCK = [
  ["هدى", "اسمي سارة."],
  ["راين", "اسمي سامي."],
  ["منى", "اسمي لينا."],
  ["إبراهيم", "اسمي كريم."],
  ["همسة", "اسمي رنا."],
  ["أيهم", "اسمي وائل."],
  ["نور", "اسمي هبة."],
  ["عالء الدين", "اسمي فادي."],
  ["أماين", "اسمي سلمى."],
  ["عامر", "اسمي زياد."],
] as const;

function appendixFor(question: string): string {
  const lines = [question, question];
  for (const [name, arabic] of SPEAKER_BLOCK) {
    lines.push(`${name}:`, arabic);
  }
  return lines.join("\n");
}

describe("parseShwayyAppendix", () => {
  it("keeps a wrapped last answer in the same section", () => {
    const raw = `${appendixFor("شو اسمك؟")}
اسمي زياد من الشام.
©
| 156
\f
إنت من وين؟
إنتي من وين؟
هدى:
أنا من بيروت.
راين:
من الشام.
منى:
من حلب.
إبراهيم:
من طرابلس.
همسة:
من بعبدا.
أيهم:
من الشام.
نور:
من المزة.
عالء الدين:
من حلب.
أماين:
من حلب.
عامر:
من قونيا.
`;
    const sections = parseShwayyAppendix(raw);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.answers).toHaveLength(10);
    expect(sections[0]?.answers.at(-1)?.arabic).toBe("اسمي زياد. اسمي زياد من الشام.");
    expect(sections[1]?.questions).toEqual(["إنت من وين؟", "إنتي من وين؟"]);
    expect(sections[1]?.answers[0]?.arabic).toBe("أنا من بيروت.");
  });

  it("does not treat a name inside an answer as a new speaker", () => {
    const raw = appendixFor("شو اسمك؟").replace(
      "اسمي لينا.",
      "منى نور الدين من بيروت.",
    );
    const sections = parseShwayyAppendix(raw);
    expect(sections[0]?.answers).toHaveLength(10);
    expect(sections[0]?.answers[2]?.arabic).toBe("منى نور الدين من بيروت.");
  });
});

describe("parseShwayyEnglish", () => {
  it("joins a wrapped translation until the speaker label", () => {
    const hits = parseShwayyEnglish(`
My name is Hoda Helal. Hoda means orientation
and it is a common name.
Hoda L
The name on my I.D. is Mohamed Rani.
Rani L
`);
    expect(hits[0]).toEqual({
      speaker: "Hoda",
      translation:
        "My name is Hoda Helal. Hoda means orientation and it is a common name.",
    });
    expect(hits[1]?.speaker).toBe("Rani");
  });
});

describe("parseShwayyToc", () => {
  it("reads numbered titles", () => {
    const titles = parseShwayyToc(`
1. What's your name? ................................................................................................... 1
2. Where are you from? ................................................................................................ 6
`);
    expect(titles[0]).toBe("What's your name?");
    expect(titles[1]).toBe("Where are you from?");
  });
});

describe("buildShwayyBundle", () => {
  it("emits one text with ten speaker lines", () => {
    const english = SPEAKER_BLOCK.map(
      ([, arabic], index) =>
        `I am speaker ${index + 1}.\n${["Hoda","Rani","Mona","Ibrahim","Hamsa","Ayham","Nour","Aladdin","Amani","Ammar"][index]} L`,
    ).join("\n");
    const bundle = buildShwayyBundle({
      appendix: appendixFor("شو اسمك؟"),
      english,
      toc: "1. What's your name? ............... 1\n",
    });
    expect(bundle.items).toHaveLength(1);
    const item = bundle.items[0];
    expect(item.title).toBe("Q01 · What's your name?");
    expect(item.source).toBe("shwayy-an-haali q01");
    expect(item.arabic?.split("\n")).toHaveLength(10);
    expect(item.translation?.split("\n")).toHaveLength(10);
    const parsed = parseImportBundle(JSON.stringify(bundle));
    expect(parsed.ok).toBe(true);
  });
});

describe("alignSectionTranslations", () => {
  it("skips English when speaker order breaks", () => {
    const names = [
      "Hoda",
      "Rani",
      "Mona",
      "Ibrahim",
      "Hamsa",
      "Ayham",
      "Nour",
      "Aladdin",
      "Amani",
      "Ammar",
    ];
    const good = names.map((speaker) => ({ speaker, translation: `${speaker} one` }));
    const broken = [
      { speaker: "Hoda", translation: "Hoda two" },
      { speaker: "Ayham", translation: "shifted" },
    ];
    const aligned = alignSectionTranslations(2, [...good, ...broken]);
    expect(aligned[0]).toHaveLength(10);
    expect(aligned[1]).toBeNull();
  });
});

describe("tidyArabic", () => {
  it("drops bidi marks and fixes punctuation space", () => {
    expect(tidyArabic("اسمي\u202a.\u202cهدى")).toBe("اسمي. هدى");
  });
});

describe("parseShwayyGlossary", () => {
  it("reads layout vocab callouts and skips plural forms inside parens", () => {
    const raw = `
♀ شو اسمك؟                                             معروفma3rūf well-known, common
شوšū what
اسمísim (pl.  أساميasêmi) name                         هوhúwwi m. it; he
توجيهtawjīh orientation                                شويšwayy (+ adjective) a little, somewhat
إرشادiršêd guidance
ـي-i my
1|                  ©
`;
    const entries = parseShwayyGlossary(raw);
    const byArabic = Object.fromEntries(
      entries.map((entry) => [entry.arabic, entry]),
    );
    expect(byArabic["معروف"]).toMatchObject({
      transliteration: "ma3rūf",
      gloss: "well-known, common",
    });
    expect(byArabic["اسم"]).toMatchObject({
      transliteration: "ísim",
      gloss: "name",
    });
    expect(byArabic["أسامي"]).toBeUndefined();
    expect(byArabic["توجيه"]?.gloss).toBe("orientation");
    expect(byArabic["شوي"]?.gloss).toBe("a little, somewhat");
    expect(byArabic["إرشاد"]?.gloss).toBe("guidance");
    expect(byArabic["ـي"]?.gloss).toMatch(/my/i);
  });

  it("builds a vocabulary-only import bundle", () => {
    const bundle = buildShwayyGlossaryBundle(`
معروفma3rūf well-known, common
بسbass but; just
`);
    expect(bundle.items).toHaveLength(2);
    expect(bundle.items[0]?.type).toBe("vocabulary");
    expect(bundle.items[0]?.source).toBe("shwayy-an-haali-glossary");
    expect(bundle.items[0]?.glosses?.[0]?.text).toBe("well-known, common");
    const parsed = parseImportBundle(JSON.stringify(bundle));
    expect(parsed.ok).toBe(true);
  });
});
