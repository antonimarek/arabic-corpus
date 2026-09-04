import { describe, expect, it } from "vitest";

import { withSegmentEnds } from "./align";
import type { FathomSegment } from "./fathom-parse";
import { mapWisprTextOntoFathomSegments } from "./wispr-align";
import { parseWisprTranscript } from "./wispr-parse";

describe("mapWisprTextOntoFathomSegments", () => {
  it("keeps Fathom speakers and overlays Wispr wording", () => {
    const fathom: FathomSegment[] = [
      {
        timestampSeconds: 10,
        timestampLabel: "0:10",
        speaker: "Antoni",
        text: "I'm Tavan",
      },
      {
        timestampSeconds: 20,
        timestampLabel: "0:20",
        speaker: "Speaker 2",
        text: "Rah ali lesson",
      },
    ];
    const wispr = parseWisprTranscript(`Antoni Marek (You): Taban.
Moayad: راح عليّ درس.`);
    const mapped = mapWisprTextOntoFathomSegments({
      fathomSegments: withSegmentEnds(fathom, 40),
      wisprTurns: wispr,
    });

    expect(mapped).toHaveLength(2);
    expect(mapped[0]?.speaker).toBe("Antoni");
    expect(mapped[0]?.wisprText.toLowerCase()).toContain("taban");
    expect(mapped[1]?.speaker).toBe("Speaker 2");
    expect(mapped[1]?.wisprText).toContain("راح");
  });
});
