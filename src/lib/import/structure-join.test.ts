import { describe, expect, it } from "vitest";

import {
  collectStructureNameIds,
  structureIdsForExample,
} from "@/lib/import/structure-join";

describe("structure-join", () => {
  it("maps bundle structure names to created or matched ids", () => {
    const map = collectStructureNameIds(
      [
        { type: "structure", name: "كنت عم + verb" },
        { type: "example", arabic: "شو كنت عم تعمل؟" },
        { type: "structure", name: "فاتني" },
      ],
      ["struct-1", "ex-1", "struct-2"],
    );
    expect(map.get("كنت عم + verb")).toBe("struct-1");
    expect(map.get("فاتني")).toBe("struct-2");
  });

  it("resolves example structure_names against the same-bundle map", () => {
    const nameToId = new Map([
      ["كنت عم + verb", "struct-1"],
      ["فاتني", "struct-2"],
    ]);
    expect(
      structureIdsForExample(
        {
          type: "example",
          arabic: "شو كنت عم تعمل؟",
          structure_names: ["كنت عم + verb", "missing", "فاتني", "كنت عم + verb"],
        },
        nameToId,
      ),
    ).toEqual(["struct-1", "struct-2"]);
  });
});
