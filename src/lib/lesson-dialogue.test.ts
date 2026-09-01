import { describe, expect, it } from "vitest";

import { parseDialogueLine, parseDialogueLines, roleLabel } from "@/lib/lesson-dialogue";

describe("parseDialogueLine", () => {
  it("parses tutor and student prefixes", () => {
    expect(parseDialogueLine("[TUTOR] hello")).toEqual({
      role: "TUTOR",
      text: "hello",
    });
    expect(parseDialogueLine("[STUDENT] أنا")).toEqual({
      role: "STUDENT",
      text: "أنا",
    });
  });
});

describe("parseDialogueLines", () => {
  it("assigns line numbers", () => {
    const lines = parseDialogueLines("[TUTOR] one\n[STUDENT] two");
    expect(lines).toHaveLength(2);
    expect(lines[0]?.lineNumber).toBe(1);
    expect(lines[1]?.role).toBe("STUDENT");
  });
});

describe("roleLabel", () => {
  it("maps roles to labels", () => {
    expect(roleLabel("TUTOR")).toBe("Tutor");
    expect(roleLabel("STUDENT")).toBe("You");
  });
});
