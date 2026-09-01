"use client";

import type { TextAudioController } from "@/lib/text-audio-controller";

type TextAudioPlayerProps = {
  audioUrl: string;
  controller: TextAudioController;
  fixedRate?: number;
  nonEmptyLineCount?: number;
};

export function TextAudioPlayer({
  audioUrl,
  controller,
  fixedRate,
  nonEmptyLineCount = 0,
}: TextAudioPlayerProps) {
  const {
    audioRef,
    currentMs,
    durationMs,
    playing,
    rate,
    marking,
    markedLineCount,
    setRate,
    setMarking,
    seekToMs,
    formatClock,
    audioEventHandlers,
  } = controller;

  return (
    <div className="ui-panel flex flex-col gap-2 px-3 py-3">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        {...audioEventHandlers}
      />
      <div className="flex flex-col gap-2" dir="ltr">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="min-h-11 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              const el = audioRef.current;
              if (!el) return;
              if (el.paused) {
                void el.play();
              } else {
                el.pause();
              }
            }}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)]"
            onClick={() => seekToMs(currentMs - 5000)}
          >
            −5s
          </button>
          <button
            type="button"
            className="min-h-11 rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)]"
            onClick={() => seekToMs(currentMs + 5000)}
          >
            +5s
          </button>
          {fixedRate == null
            ? [0.75, 0.9, 1].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={rate === value}
                  className={`min-h-11 rounded-md px-3 py-2 text-sm ${
                    rate === value
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--line)] text-[var(--ink)]"
                  }`}
                  onClick={() => setRate(value)}
                >
                  {value}×
                </button>
              ))
            : (
              <span className="text-sm text-[var(--ink-muted)]">{fixedRate}×</span>
            )}
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <span className="w-10 shrink-0 font-sans text-xs tabular-nums text-[var(--ink-muted)]">
            {formatClock(currentMs)}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(durationMs, 1)}
            step={50}
            value={Math.min(currentMs, durationMs || 0)}
            disabled={durationMs <= 0}
            aria-label="Playback position"
            aria-valuetext={formatClock(currentMs)}
            className="h-11 w-full accent-[var(--accent)]"
            onChange={(event) => {
              seekToMs(Number(event.currentTarget.value));
            }}
          />
          <span className="w-10 shrink-0 text-end font-sans text-xs tabular-nums text-[var(--ink-muted)]">
            {formatClock(durationMs)}
          </span>
        </label>
      </div>
      <button
        type="button"
        aria-pressed={marking}
        className={`self-start min-h-11 rounded-md px-3 py-2 text-sm ${
          marking
            ? "bg-[var(--accent)] text-white"
            : "border border-[var(--line)] text-[var(--ink)]"
        }`}
        onClick={() => setMarking(!marking)}
      >
        {marking ? "Stop stamping lines" : "Stamp line starts"}
      </button>
      <p className="text-xs text-[var(--ink-muted)]">
        {marking
          ? "Drag the slider to a speaker start, then tap that line number. Tap again to fix a miss."
          : markedLineCount > 0
            ? `Stamped ${markedLineCount} of ${nonEmptyLineCount}. Tap a stamped number to play that speaker only.`
            : "Stamp each speaker start so a line number plays that clip, not the whole track."}
      </p>
    </div>
  );
}
