import { describe, expect, it } from "vitest";

import { blockDirection, isMostlyArabic } from "@/lib/markdown-direction";

describe("blockDirection", () => {
  it("uses rtl for Arabic-only text", () => {
    expect(blockDirection("كل يوم")).toBe("rtl");
  });

  it("uses ltr for English-only text", () => {
    expect(blockDirection("every day")).toBe("ltr");
  });

  it("leaves mixed lines undefined", () => {
    expect(blockDirection("Force yourself to use: صعب إنه")).toBeUndefined();
  });
});

describe("isMostlyArabic", () => {
  it("detects Arabic-heavy lines", () => {
    expect(isMostlyArabic("شو معنى كلمة بفضل؟")).toBe(true);
    expect(isMostlyArabic("every day — كل يوم")).toBe(false);
  });
});
