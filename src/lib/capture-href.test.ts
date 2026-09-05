import { describe, expect, it } from "vitest";

import { newStructureHref } from "@/lib/capture-href";

describe("newStructureHref", () => {
  it("prefills arabic and line when a text is known", () => {
    expect(
      newStructureHref({
        arabic: "فاتني",
        textId: "text-1",
        lineNumber: 4,
      }),
    ).toBe(
      `/structures/new?${new URLSearchParams({
        arabic: "فاتني",
        text: "text-1",
        line: "4",
      }).toString()}`,
    );
  });

  it("links an existing example without converting it", () => {
    expect(
      newStructureHref({
        arabic: "فاتني الدرس",
        exampleId: "ex-1",
      }),
    ).toBe(
      `/structures/new?${new URLSearchParams({
        arabic: "فاتني الدرس",
        example: "ex-1",
      }).toString()}`,
    );
  });
});
