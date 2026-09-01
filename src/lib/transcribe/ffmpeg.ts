import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ClipSpec = {
  inputPath: string;
  outputPath: string;
  startSeconds: number;
  durationSeconds: number;
};

export async function extractClip(spec: ClipSpec): Promise<void> {
  const { inputPath, outputPath, startSeconds, durationSeconds } = spec;
  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(startSeconds),
    "-t",
    String(durationSeconds),
    "-i",
    inputPath,
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "aac",
    outputPath,
  ]);
}

export async function probeDurationSeconds(inputPath: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    inputPath,
  ]);
  const value = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Could not read audio duration for ${inputPath}`);
  }
  return value;
}

export async function compressAudioForCorpus(
  inputPath: string,
  outputPath: string,
  maxBytes: number,
): Promise<{ outputPath: string; bytes: number }> {
  const bitrates = ["64k", "48k", "32k"];
  for (const bitrate of bitrates) {
    await execFileAsync("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "aac",
      "-b:a",
      bitrate,
      outputPath,
    ]);
    const { stat } = await import("node:fs/promises");
    const bytes = (await stat(outputPath)).size;
    if (bytes <= maxBytes) {
      return { outputPath, bytes };
    }
  }
  const { stat } = await import("node:fs/promises");
  const bytes = (await stat(outputPath)).size;
  if (bytes > maxBytes) {
    throw new Error(
      `Compressed audio is still ${bytes} bytes (limit ${maxBytes}). Split audio or raise corpus limit.`,
    );
  }
  return { outputPath, bytes };
}
