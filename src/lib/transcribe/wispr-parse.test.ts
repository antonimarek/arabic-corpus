import { describe, expect, it } from "vitest";

import {
  mergeConsecutiveWisprTurns,
  parseWisprTranscript,
  wisprRoleForSpeaker,
} from "./wispr-parse";

describe("wisprRoleForSpeaker", () => {
  it("maps Antoni to student and Moayad / clip speakers to tutor", () => {
    expect(wisprRoleForSpeaker("Antoni Marek (You)")).toBe("STUDENT");
    expect(wisprRoleForSpeaker("Moayad")).toBe("TUTOR");
    expect(wisprRoleForSpeaker("Speaker 3")).toBe("TUTOR");
    expect(wisprRoleForSpeaker("Audio")).toBe("TUTOR");
    expect(wisprRoleForSpeaker("Speaker 4")).toBe("OTHER");
  });
});

describe("parseWisprTranscript", () => {
  it("parses Name: text lines and drops OTHER by default", () => {
    const turns = parseWisprTranscript(`Antoni Marek (You): Taban.
Moayad:  راح عليّ درس.
Speaker 4: ignored
`);
    expect(turns).toHaveLength(2);
    expect(turns[0]?.role).toBe("STUDENT");
    expect(turns[0]?.text).toBe("Taban.");
    expect(turns[1]?.role).toBe("TUTOR");
    expect(turns[1]?.text).toContain("راح علي");
  });

  it("parses optional [MM:SS] prefixes into startSeconds", () => {
    const turns = parseWisprTranscript(`[02:37] Moayad: مرحبا.
[03:01] Antoni Marek (You): تمام.
`);
    expect(turns).toHaveLength(2);
    expect(turns[0]?.startSeconds).toBe(2 * 60 + 37);
    expect(turns[1]?.startSeconds).toBe(3 * 60 + 1);
  });
});

describe("mergeConsecutiveWisprTurns", () => {
  it("merges same speaker runs", () => {
    const merged = mergeConsecutiveWisprTurns(
      parseWisprTranscript(`Antoni Marek (You): one
Antoni Marek (You): two
Moayad: three`),
    );
    expect(merged).toHaveLength(2);
    expect(merged[0]?.text).toBe("one two");
  });
});
