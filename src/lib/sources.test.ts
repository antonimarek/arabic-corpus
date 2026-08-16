import { describe, expect, it } from "vitest";

import { SHWAYY_SOURCE_PREFIX } from "@/lib/import/parsers/shwayy";
import {
  SOURCE_ENTRIES,
  SOURCE_JOBS,
  SHWAYY_SOURCE_PREFIX as PLAYBOOK_PREFIX,
  sourceIdsAreUnique,
  sourcesForJob,
} from "@/lib/sources";

describe("source playbook", () => {
  it("has unique ids and every job", () => {
    expect(sourceIdsAreUnique()).toBe(true);
    for (const job of SOURCE_JOBS) {
      expect(sourcesForJob(job).length).toBeGreaterThan(0);
    }
  });

  it("marks Shwayy as the owned spine", () => {
    const shwayy = SOURCE_ENTRIES.find((entry) => entry.id === "shwayy");
    expect(shwayy?.owned).toBe(true);
    expect(shwayy?.job).toBe("spine");
    expect(shwayy?.sourcePrefix).toBe(SHWAYY_SOURCE_PREFIX);
    expect(PLAYBOOK_PREFIX).toBe(SHWAYY_SOURCE_PREFIX);
  });
});
