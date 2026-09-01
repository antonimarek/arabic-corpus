import { describe, expect, it } from "vitest";

import { parseAiProduceCold } from "@/lib/ai-study-plan-parse";

const SAMPLE = `## Produce cold

* **Cue (English):** It is not easy to go back to work after vacation.

* **Say (Arabic):** مو سهل إنه أرجع عالشغل.

* **Note:** Also practiced صعب الرجعة.

* **Cue (English):** I prefer to be alone.

* **Say (Arabic):** أنا بفضل إني أكون لحالي.

## Fix these

* **You said:** test
`;

describe("parseAiProduceCold", () => {
  it("extracts cue and say pairs from ChatGPT-style markdown", () => {
    const items = parseAiProduceCold(SAMPLE);
    expect(items).toHaveLength(2);
    expect(items[0]?.sayAr).toContain("مو سهل");
    expect(items[0]?.cueEn).toContain("vacation");
    expect(items[1]?.sayAr).toContain("بفضل");
  });

  it("returns empty when section is missing", () => {
    expect(parseAiProduceCold("## This week\n- foo")).toEqual([]);
  });
});
