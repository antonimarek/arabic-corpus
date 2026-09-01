"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  formatPlaybackClock,
  lineAtTimeMs,
  linePlaybackWindow,
  normalizeLineStarts,
  setLineStart,
} from "@/lib/audio";
import { saveTextLineStarts } from "@/app/(app)/texts/audio-actions";

export type TextAudioInput = {
  url: string;
  durationMs: number | null;
  lineStarts: number[] | null;
};

export type TextAudioController = {
  audioRef: RefObject<HTMLAudioElement | null>;
  lineStarts: (number | null)[];
  currentMs: number;
  durationMs: number;
  playing: boolean;
  rate: number;
  marking: boolean;
  activeLine: number | null;
  markedLineCount: number;
  setRate: (rate: number) => void;
  setMarking: (marking: boolean) => void;
  seekToMs: (ms: number) => void;
  playSpan: (startMs: number, endMs: number | null) => void;
  playLine: (lineNumber: number) => void;
  onLineNumberClick: (lineNumber: number, hasLineTranslation?: boolean) => void;
  formatClock: (ms: number) => string;
  audioEventHandlers: {
    onLoadedMetadata: (event: React.SyntheticEvent<HTMLAudioElement>) => void;
    onPlay: () => void;
    onPause: () => void;
    onEnded: () => void;
    onTimeUpdate: (event: React.SyntheticEvent<HTMLAudioElement>) => void;
  };
};

export function useTextAudioController(
  textId: string,
  audio: TextAudioInput | null,
  fixedRate?: number,
): TextAudioController {
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAtRef = useRef<number | null>(null);
  const scrubbingRef = useRef(false);
  const audioUrlRef = useRef(audio?.url ?? null);
  const restorePlaybackRef = useRef<{
    timeSec: number;
    wasPlaying: boolean;
  } | null>(null);
  const stampSaveChainRef = useRef<Promise<void>>(Promise.resolve());

  const [marking, setMarking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(audio?.durationMs ?? 0);
  const [rate, setRate] = useState(fixedRate ?? 1);
  const [lineStarts, setLineStarts] = useState(() =>
    normalizeLineStarts(audio?.lineStarts),
  );
  const [lineStartsSource, setLineStartsSource] = useState(audio?.lineStarts);

  if (audio?.lineStarts !== lineStartsSource) {
    setLineStartsSource(audio?.lineStarts);
    setLineStarts(normalizeLineStarts(audio?.lineStarts));
  }

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = fixedRate ?? rate;
  }, [fixedRate, rate, audio?.url]);

  useEffect(() => {
    const nextUrl = audio?.url ?? null;
    const prevUrl = audioUrlRef.current;
    if (nextUrl === prevUrl) return;
    const el = audioRef.current;
    if (el && prevUrl && nextUrl && (el.currentTime > 0.05 || !el.paused)) {
      restorePlaybackRef.current = {
        timeSec: el.currentTime,
        wasPlaying: !el.paused,
      };
    } else {
      restorePlaybackRef.current = null;
    }
    audioUrlRef.current = nextUrl;
  }, [audio?.url]);

  const restorePlaybackAfterSrcSwap = useCallback(() => {
    const el = audioRef.current;
    const restore = restorePlaybackRef.current;
    if (!el || !restore) return;
    restorePlaybackRef.current = null;
    const apply = () => {
      el.currentTime = restore.timeSec;
      setCurrentMs(Math.round(restore.timeSec * 1000));
      if (restore.wasPlaying) {
        void el.play();
      }
    };
    if (el.readyState >= 1) {
      apply();
      return;
    }
    el.addEventListener("loadedmetadata", apply, { once: true });
  }, []);

  const queueStampSave = useCallback(
    (starts: (number | null)[]) => {
      stampSaveChainRef.current = stampSaveChainRef.current
        .catch(() => undefined)
        .then(async () => {
          await saveTextLineStarts(textId, starts);
        });
    },
    [textId],
  );

  const seekToMs = useCallback(
    (ms: number) => {
      const el = audioRef.current;
      if (!el) return;
      stopAtRef.current = null;
      const maxMs = Number.isFinite(el.duration) ? el.duration * 1000 : durationMs;
      const next = Math.max(0, Math.min(ms, maxMs || 0));
      el.currentTime = next / 1000;
      setCurrentMs(next);
    },
    [durationMs],
  );

  const playSpan = useCallback((startMs: number, endMs: number | null) => {
    const el = audioRef.current;
    if (!el) return;
    stopAtRef.current = endMs != null ? endMs / 1000 : null;
    el.currentTime = startMs / 1000;
    setCurrentMs(startMs);
    void el.play();
  }, []);

  const playLine = useCallback(
    (lineNumber: number) => {
      const span = linePlaybackWindow(
        lineStarts,
        lineNumber,
        durationMs || audio?.durationMs || null,
      );
      if (!span) return;
      playSpan(span.startMs, span.endMs);
    },
    [audio?.durationMs, durationMs, lineStarts, playSpan],
  );

  const onLineNumberClick = useCallback(
    (lineNumber: number, _hasLineTranslation = false) => {
      const el = audioRef.current;
      if (marking && el && audio) {
        const next = setLineStart(lineStarts, lineNumber, el.currentTime * 1000);
        setLineStarts(next);
        queueStampSave(next);
        return;
      }
      const span = linePlaybackWindow(
        lineStarts,
        lineNumber,
        durationMs || audio?.durationMs || null,
      );
      if (span) {
        playLine(lineNumber);
      }
    },
    [audio, durationMs, lineStarts, marking, playLine, queueStampSave],
  );

  const audioEventHandlers = {
    onLoadedMetadata: (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const ms = event.currentTarget.duration * 1000;
      if (Number.isFinite(ms) && ms > 0) setDurationMs(Math.round(ms));
      restorePlaybackAfterSrcSwap();
    },
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => {
      setPlaying(false);
      stopAtRef.current = null;
    },
    onTimeUpdate: (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const el = event.currentTarget;
      if (!scrubbingRef.current) {
        setCurrentMs(Math.round(el.currentTime * 1000));
      }
      const stopAt = stopAtRef.current;
      if (stopAt == null) return;
      if (el.currentTime >= stopAt) {
        el.pause();
        stopAtRef.current = null;
      }
    },
  };

  const markedLineCount = lineStarts.filter((start) => start != null).length;
  const activeLine = lineAtTimeMs(lineStarts, currentMs);

  return {
    audioRef,
    lineStarts,
    currentMs,
    durationMs,
    playing,
    rate,
    marking,
    activeLine,
    markedLineCount,
    setRate,
    setMarking,
    seekToMs,
    playSpan,
    playLine,
    onLineNumberClick,
    formatClock: formatPlaybackClock,
    audioEventHandlers,
  };
}
