import { hasArabicScript } from "@/lib/mixed-script";

const LATIN_RE = /[A-Za-z]/;

/** Block direction for study-plan markdown. Mixed lines inherit LTR from the container. */
export function blockDirection(text: string): "ltr" | "rtl" | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const hasAr = hasArabicScript(trimmed);
  const hasEn = LATIN_RE.test(trimmed);
  if (hasAr && !hasEn) return "rtl";
  if (hasEn && !hasAr) return "ltr";
  return undefined;
}

export function isMostlyArabic(text: string): boolean {
  const arabic = (text.match(/[\u0600-\u06FF]/gu) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return arabic > latin && arabic > 0;
}
