import { describe, expect, it } from "vitest";

import {
  applyImportProvenance,
  originFromTags,
  originTag,
  resolveImportProvenance,
  valueFactor,
  valueFromTags,
  valueTag,
} from "@/lib/import/origin";

describe("import provenance", () => {
  it("stamps origin and value tags and replaces old ones", () => {
    const bundle = applyImportProvenance(
      {
        source: { title: "notes" },
        items: [
          { tags: ["time", "origin:generated", "value:low"] },
          { tags: [] },
        ],
      },
      "lesson",
      "high",
    );
    expect(bundle.source?.origin).toBe("lesson");
    expect(bundle.source?.value).toBe("high");
    expect(bundle.items[0]?.tags).toEqual([
      "time",
      originTag("lesson"),
      valueTag("high"),
    ]);
    expect(bundle.items[1]?.tags).toEqual([
      originTag("lesson"),
      valueTag("high"),
    ]);
  });

  it("keeps JSON origin when the form was not touched", () => {
    expect(
      resolveImportProvenance(
        { source: { origin: "native", value: "high" } },
        "lesson",
        "high",
        false,
      ),
    ).toEqual({ origin: "native", value: "high" });
  });

  it("lets the form override JSON origin after a chip click", () => {
    expect(
      resolveImportProvenance(
        { source: { origin: "native", value: "high" } },
        "generated",
        "low",
        true,
      ),
    ).toEqual({ origin: "generated", value: "low" });
  });

  it("defaults missing JSON origin to lesson / high", () => {
    expect(resolveImportProvenance({}, "lesson", "high", false)).toEqual({
      origin: "lesson",
      value: "high",
    });
  });

  it("maps value to a numeric factor", () => {
    expect(valueFactor("high")).toBe(3);
    expect(valueFactor("mid")).toBe(2);
    expect(valueFactor("low")).toBe(1);
  });

  it("reads origin and value back from tags", () => {
    expect(originFromTags(["time", "origin:book"])).toBe("book");
    expect(valueFromTags(["value:low", "time"])).toBe("low");
  });
});
