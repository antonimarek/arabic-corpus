import { describe, expect, it } from "vitest";

import {
  extractArabicRuns,
  extractLatinRuns,
  longestArabicRun,
  longestLatinRun,
  splitScriptRuns,
  stripDialogueRolePrefix,
} from "@/lib/mixed-script";

describe("stripDialogueRolePrefix", () => {
  it("removes role prefix", () => {
    expect(stripDialogueRolePrefix("[TUTOR] hello")).toBe("hello");
    expect(stripDialogueRolePrefix("[STUDENT] أنا")).toBe("أنا");
  });
});

describe("splitScriptRuns", () => {
  it("splits pure Arabic", () => {
    expect(splitScriptRuns("أنا بفضل إني أكون لحالي")).toEqual([
      { script: "arabic", text: "أنا بفضل إني أكون لحالي" },
    ]);
  });

  it("splits pure English", () => {
    expect(splitScriptRuns("Because you prefer to be alone.")).toEqual([
      { script: "latin", text: "Because you prefer to be alone." },
    ]);
  });

  it("splits mixed inline text into stacked runs", () => {
    const runs = splitScriptRuns("Just اليوم الجاي for next time.");
    expect(runs.map((run) => run.script)).toEqual(["latin", "arabic", "latin"]);
    expect(runs[1]?.text).toBe("اليوم الجاي");
  });

  it("strips tutor prefix before splitting", () => {
    const runs = splitScriptRuns("[TUTOR] أنا بفضل because I like it.");
    expect(runs[0]?.script).toBe("arabic");
    expect(runs[1]?.script).toBe("latin");
  });
});

describe("extract helpers", () => {
  it("picks longest runs", () => {
    const text = "ok اليوم الجاي and اليوم اللي بعده tomorrow";
    expect(longestArabicRun(text)).toBe("اليوم اللي بعده");
    expect(longestLatinRun(text)).toBe("tomorrow");
    expect(extractArabicRuns(text)).toHaveLength(2);
    expect(extractLatinRuns(text).length).toBeGreaterThan(0);
  });
});
