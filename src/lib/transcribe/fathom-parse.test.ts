import { describe, expect, it } from "vitest";

import {
  parseFathomTranscript,
  segmentsInWindow,
  toDialogueMarkdown,
} from "./fathom-parse";

describe("parseFathomTranscript", () => {
  it("parses speaker-labelled Fathom MCP lines", () => {
    const content = `[00:02](https://fathom.video/calls/1?timestamp=2) Student: Hey\\!
[09:08](https://fathom.video/calls/1?timestamp=548) Speaker 2: Just اليوم الجاي.`;

    const segments = parseFathomTranscript(content);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      timestampSeconds: 2,
      speaker: "Student",
      text: "Hey!",
    });
    expect(segments[1]?.text).toContain("اليوم الجاي");
  });

  it("filters segments to a clip window", () => {
    const segments = parseFathomTranscript(
      `[00:02](https://x?timestamp=2) Student: one
[15:01](https://x?timestamp=901) Speaker 2: two
[20:00](https://x?timestamp=1200) Student: three`,
    );

    const window = segmentsInWindow(segments, 900, 300);
    expect(window.map((segment) => segment.text)).toEqual(["two"]);
  });

  it("renders tutor/student dialogue", () => {
    const markdown = toDialogueMarkdown(
      parseFathomTranscript(
        `[01:00](https://x?timestamp=60) Student: student line
[01:05](https://x?timestamp=65) Speaker 2: tutor line`,
      ),
    );

    expect(markdown).toContain("[01:00] STUDENT");
    expect(markdown).toContain("[01:05] TUTOR");
  });
});
