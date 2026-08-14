import { describe, expect, it } from "vitest";

import type { VocabularyListRow } from "@/lib/vocabulary-list";
import {
  filterVocabularyRows,
  parsePosKindParam,
  parseSortParam,
  presentPosKinds,
  sortVocabularyRows,
  vocabularyEmptyMessage,
  vocabularyRowSubtitle,
} from "@/lib/vocabulary-list";

const now = new Date("2026-08-14T12:00:00Z");

function row(
  overrides: Partial<VocabularyListRow> & Pick<VocabularyListRow, "id">,
): VocabularyListRow {
  return {
    href: `/vocabulary/${overrides.id}`,
    tags: [],
    arabic: "كتب",
    kind: "verb",
    createdAt: "2026-08-14T00:00:00Z",
    ...overrides,
  };
}

describe("parse params", () => {
  it("accepts verb noun other and drops the rest", () => {
    expect(parsePosKindParam("verb")).toBe("verb");
    expect(parsePosKindParam("noun")).toBe("noun");
    expect(parsePosKindParam("other")).toBe("other");
    expect(parsePosKindParam("particle")).toBeNull();
    expect(parsePosKindParam(null)).toBeNull();
  });

  it("defaults sort to newest", () => {
    expect(parseSortParam("oldest")).toBe("oldest");
    expect(parseSortParam("newest")).toBe("newest");
    expect(parseSortParam(null)).toBe("newest");
  });
});

describe("presentPosKinds", () => {
  it("keeps verb noun other order and hides empty kinds", () => {
    expect(
      presentPosKinds([
        row({ id: "1", kind: "other" }),
        row({ id: "2", kind: "verb" }),
      ]),
    ).toEqual(["verb", "other"]);
  });
});

describe("filter and sort", () => {
  const rows = [
    row({
      id: "v",
      kind: "verb",
      tags: ["food"],
      createdAt: "2026-08-10T00:00:00Z",
    }),
    row({
      id: "n",
      kind: "noun",
      tags: ["food"],
      createdAt: "2026-08-12T00:00:00Z",
    }),
    row({
      id: "p",
      kind: "other",
      partOfSpeech: "particle",
      tags: ["grammar"],
      createdAt: "2026-08-11T00:00:00Z",
    }),
  ];

  it("filters by kind and tag together", () => {
    expect(filterVocabularyRows(rows, "verb", null).map((item) => item.id)).toEqual(
      ["v"],
    );
    expect(
      filterVocabularyRows(rows, null, "food").map((item) => item.id),
    ).toEqual(["v", "n"]);
    expect(
      filterVocabularyRows(rows, "noun", "food").map((item) => item.id),
    ).toEqual(["n"]);
    expect(filterVocabularyRows(rows, "verb", "grammar")).toEqual([]);
  });

  it("sorts by createdAt", () => {
    expect(sortVocabularyRows(rows, "newest").map((item) => item.id)).toEqual([
      "n",
      "p",
      "v",
    ]);
    expect(sortVocabularyRows(rows, "oldest").map((item) => item.id)).toEqual([
      "v",
      "p",
      "n",
    ]);
  });
});

describe("vocabularyRowSubtitle", () => {
  it("joins transliteration pos gloss and age", () => {
    expect(
      vocabularyRowSubtitle(
        {
          transliteration: "katab",
          partOfSpeech: "verb",
          gloss: "write",
          createdAt: "2026-08-11T12:00:00Z",
        },
        false,
        now,
      ),
    ).toBe("katab · verb · write · 3d");
  });

  it("drops pos when the kind filter is on", () => {
    expect(
      vocabularyRowSubtitle(
        {
          transliteration: "katab",
          partOfSpeech: "verb",
          gloss: "write",
          createdAt: "2026-08-11T12:00:00Z",
        },
        true,
        now,
      ),
    ).toBe("katab · write · 3d");
  });
});

describe("vocabularyEmptyMessage", () => {
  it("names the kind and tag", () => {
    expect(vocabularyEmptyMessage("verb", "food")).toBe(
      "No verbs with this tag.",
    );
    expect(vocabularyEmptyMessage("noun", null)).toBe("No nouns.");
    expect(vocabularyEmptyMessage("other", "grammar")).toBe(
      "No other words with this tag.",
    );
    expect(vocabularyEmptyMessage(null, "food")).toBe("No rows with this tag.");
  });
});
