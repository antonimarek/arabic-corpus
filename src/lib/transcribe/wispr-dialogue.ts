import type { DialogueTurn } from "./align";
import type { WisprTurn } from "./wispr-parse";
import { mergeConsecutiveWisprTurns } from "./wispr-parse";

function formatTimestamp(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Build corpus dialogue turns from a Wispr Flow transcript alone.
 * Uses clock labels when turns have `startSeconds`; otherwise L1, L2, …
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
  for (let i = 0; i < source.length; i += 1) {
    const turn = source[i];
    if (turn.role !== "TUTOR" && turn.role !== "STUDENT") continue;
    const text = turn.text.trim();
    if (!text) continue;

    const index = dialogue.length + 1;
    const startSeconds = turn.startSeconds ?? 0;
    const nextStart = source[i + 1]?.startSeconds;
    const endSeconds =
      nextStart != null && nextStart > startSeconds ? nextStart : startSeconds;
    const hasClock = turn.startSeconds != null;

    dialogue.push({
      startSeconds,
      endSeconds,
      timestampLabel: hasClock ? formatTimestamp(startSeconds) : `L${index}`,
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
