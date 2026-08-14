"use client";

import { useRef, useState } from "react";

import {
  clearTextAudio,
  saveTextAudioMeta,
} from "@/app/(app)/texts/audio-actions";
import {
  AUDIO_MAX_BYTES,
  isAllowedAudioFile,
  textAudioPath,
} from "@/lib/audio";
import { TEXT_AUDIO_BUCKET } from "@/lib/audio-storage";
import { createClient } from "@/lib/supabase/client";

function readDurationMs(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const ms = Number.isFinite(audio.duration)
        ? Math.round(audio.duration * 1000)
        : null;
      URL.revokeObjectURL(url);
      resolve(ms && ms > 0 ? ms : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}

function pickRecorderMime(): { mime: string; ext: string } {
  const candidates = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  ];
  for (const candidate of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(candidate.mime)
    ) {
      return candidate;
    }
  }
  return { mime: "audio/webm", ext: "webm" };
}

export function TextAudioField({
  textId,
  hasAudio,
}: {
  textId: string;
  hasAudio: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    const allowed = isAllowedAudioFile(file);
    if (!allowed.ok) {
      setError(allowed.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sign in to add audio.");
        return;
      }
      const path = textAudioPath(user.id, textId, allowed.ext);
      const durationMs = await readDurationMs(file);
      const { error: uploadError } = await supabase.storage
        .from(TEXT_AUDIO_BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type || `audio/${allowed.ext}`,
        });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const saved = await saveTextAudioMeta(textId, { path, durationMs });
      if (saved.error) {
        setError(saved.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { mime, ext } = pickRecorderMime();
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        const file = new File([blob], `recording.${ext}`, { type: mime });
        void uploadFile(file);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access failed.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-[var(--ink-muted)]">Audio</span>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="audio/ogg,audio/opus,audio/mp4,audio/mpeg,audio/webm,audio/wav,audio/x-m4a,.ogg,.opus,.m4a,.mp3,.webm,.wav"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void uploadFile(file);
          }}
        />
        <button
          type="button"
          disabled={busy || recording}
          onClick={() => inputRef.current?.click()}
          className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--ink)] disabled:opacity-60"
        >
          {busy ? "Saving…" : hasAudio ? "Replace voice note" : "Upload voice note"}
        </button>
        {recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="min-h-11 rounded-md bg-[var(--danger)] px-4 py-2 text-sm font-medium text-white"
          >
            Stop recording
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void startRecording()}
            className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--ink)] disabled:opacity-60"
          >
            Record
          </button>
        )}
        {hasAudio ? (
          <button
            type="button"
            disabled={busy || recording}
            onClick={() => {
              setBusy(true);
              void clearTextAudio(textId).finally(() => setBusy(false));
            }}
            className="min-h-11 px-3 py-2 text-sm text-[var(--ink-muted)] hover:text-[var(--danger)] hover:underline disabled:opacity-60"
          >
            Remove
          </button>
        ) : null}
      </div>
      <p className="text-xs text-[var(--ink-muted)]">
        WhatsApp voice notes work. Max {Math.round(AUDIO_MAX_BYTES / (1024 * 1024))}{" "}
        MB.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
