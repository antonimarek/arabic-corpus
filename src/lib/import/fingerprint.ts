import { createHash } from "node:crypto";

import { normalizeArabic } from "./normalize";

/**
 * Exact identity for Arabic source forms.
 * Fingerprint from normalized Arabic only — not translation.
 */
export function fingerprintArabic(arabic: string): string {
  const normalized = normalizeArabic(arabic) ?? "";
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function fileHash(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function makeStagingId(parts: Array<string | number>): string {
  return parts.map(String).join(":");
}
