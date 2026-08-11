import { describe, expect, it } from "vitest";

import {
  breakTextIntoSentenceLines,
  lineAnchorId,
  parseLineHash,
  shouldOfferSentenceSplit,
  splitTextLines,
} from "@/lib/text-lines";

describe("text lines", () => {
  it("preserves empty lines for stable numbering", () => {
    expect(splitTextLines("a\n\nb")).toEqual(["a", "", "b"]);
  });

  it("parses line hash", () => {
    expect(lineAnchorId(12)).toBe("line-12");
    expect(parseLineHash("#line-12")).toBe(12);
    expect(parseLineHash("line-3")).toBe(3);
    expect(parseLineHash("#nope")).toBeNull();
  });

  it("breaks prose on sentence endings into newlines", () => {
    expect(
      breakTextIntoSentenceLines(
        "اليوم مرَق عليّ يوم طويل. فقت الصبح وكنت تعبان. من كتر التعب حسيت.",
      ),
    ).toBe(
      "اليوم مرَق عليّ يوم طويل.\nفقت الصبح وكنت تعبان.\nمن كتر التعب حسيت.",
    );
  });

  it("keeps Arabic question and exclamation marks with the sentence", () => {
    expect(breakTextIntoSentenceLines("وينك؟ تعال! خلاص.")).toBe(
      "وينك؟\nتعال!\nخلاص.",
    );
  });

  it("does not split decimal-like dots without following space", () => {
    expect(breakTextIntoSentenceLines("الساعة 3.5 مساء.")).toBe(
      "الساعة 3.5 مساء.",
    );
  });

  it("is idempotent on already-split sentences", () => {
    const once = breakTextIntoSentenceLines("أ. ب. ج.");
    expect(breakTextIntoSentenceLines(once)).toBe(once);
  });

  it("offers split only when breaking would add lines", () => {
    expect(
      shouldOfferSentenceSplit("جملة أولى. جملة ثانية. جملة ثالثة."),
    ).toBe(true);
    expect(shouldOfferSentenceSplit("جملة واحدة.\nجملة اثنين.")).toBe(false);
    expect(shouldOfferSentenceSplit("سطر بلا نقاط")).toBe(false);
  });
});
