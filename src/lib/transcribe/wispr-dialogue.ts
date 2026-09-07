import type { DialogueTurn } from "./align";
import type { WisprTurn } from "./wispr-parse";
import { mergeConsecutiveWisprTurns } from "./wispr-parse";

/**
 * Build corpus dialogue turns from a Wispr Flow transcript alone.
 * No Fathom timestamps: labels are L1, L2, … for Study/Dialogue line refs.
 */
export function wisprTurnsToDialogue(params: {
  turns: WisprTurn[];
  /** Merge consecutive same-speaker turns before mapping (default true). */
  mergeSameSpeaker?: boolean;
}): DialogueTurn[] {
  const source =
    params.mergeSameSpeaker === false
      ? params.turns
      : mergeConsecutiveWisprTurns(params.turns);

  const dialogue: DialogueTurn[] = [];
  for (const turn of source) {
    if (turn.role !== "TUTOR" && turn.role !== "STUDENT") continue;
    const text = turn.text.trim();
    if (!text) continue;

    const index = dialogue.length + 1;
    dialogue.push({
      startSeconds: 0,
      endSeconds: 0,
      timestampLabel: `L${index}`,
      role: turn.role,
      speaker: turn.speaker,
      text,
      sttText: "",
      fathomText: "",
      wisprText: text,
      source: "wispr",
      similarity: 1,
    });
  }
  return dialogue;
}
