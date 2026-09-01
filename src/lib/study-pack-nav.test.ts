import { describe, expect, it } from "vitest";

import {
  lineNumberForTimestamp,
  parseTimestampLabel,
} from "@/lib/study-pack-nav";

describe("parseTimestampLabel", () => {
  it("parses m:ss labels", () => {
    expect(parseTimestampLabel("15:23")).toBe((15 * 60 + 23) * 1000);
    expect(parseTimestampLabel("[1:05]")).toBe(65_000);
  });

  it("parses h:mm:ss labels", () => {
    expect(parseTimestampLabel("1:02:03")).toBe((3600 + 120 + 3) * 1000);
  });

  it("returns null for invalid labels", () => {
    expect(parseTimestampLabel("")).toBeNull();
    expect(parseTimestampLabel("abc")).toBeNull();
  });
});

describe("lineNumberForTimestamp", () => {
  it("maps timestamp to the latest line that started before it", () => {
    const lineNumber = lineNumberForTimestamp("1:30", [0, 60_000, 120_000]);
    expect(lineNumber).toBe(2);
  });

  it("returns null when line starts are missing", () => {
    expect(lineNumberForTimestamp("1:30", null)).toBeNull();
  });
});
