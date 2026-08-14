import { describe, expect, it } from "vitest";

import {
  formHostHint,
  formHostScore,
  suggestedFormHosts,
} from "@/lib/form-suggest";

const akal = {
  id: "1",
  arabic: "أكل",
  root: "أكل",
  part_of_speech: "verb",
  gloss: "eat",
};

const katab = {
  id: "2",
  arabic: "كتب",
  root: "كتب",
  part_of_speech: "verb",
  gloss: "write",
};

const maktab = {
  id: "3",
  arabic: "مكتب",
  root: "كتب",
  part_of_speech: "noun",
  gloss: "office",
};

describe("formHostScore", () => {
  it("ranks alef-drop 1sg against the hamza-initial verb", () => {
    expect(formHostScore("كلت", akal)).toBeGreaterThan(formHostScore("كلت", katab));
    expect(formHostScore("كلت", akal)).toBeGreaterThan(0);
    expect(formHostHint("كلت", akal)).toMatch(/alef/i);
  });

  it("does not treat an unrelated token as the same root", () => {
    expect(formHostScore("كلت", katab)).toBe(0);
  });

  it("prefers the verb over a noun that shares the root", () => {
    expect(formHostScore("كتبوا", katab)).toBeGreaterThan(
      formHostScore("كتبوا", maktab),
    );
  });
});

describe("suggestedFormHosts", () => {
  it("returns only hosts with a positive score", () => {
    const suggested = suggestedFormHosts("كلت", [akal, katab, maktab]);
    expect(suggested.map((host) => host.id)).toEqual(["1"]);
  });
});
