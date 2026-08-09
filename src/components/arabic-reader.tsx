"use client";

import { useState } from "react";

import {
  renderLinkedArabic,
  type ArabicLink,
} from "@/lib/highlight-arabic";

type ArabicReaderProps = {
  arabic: string;
  translation?: string | null;
  transliteration?: string | null;
  links?: ArabicLink[];
  size?: "text" | "example";
  defaultShowTranslation?: boolean;
};

export function ArabicReader({
  arabic,
  translation,
  transliteration,
  links = [],
  size = "text",
  defaultShowTranslation = true,
}: ArabicReaderProps) {
  const hasTranslation = Boolean(translation?.trim());
  const [showTranslation, setShowTranslation] = useState(
    hasTranslation && defaultShowTranslation,
  );

  const arabicClass =
    size === "text"
      ? "font-arabic whitespace-pre-wrap text-[1.65rem] leading-[2] tracking-wide text-[var(--ink)] sm:text-[1.85rem] sm:leading-[2.05]"
      : "font-arabic whitespace-pre-wrap text-[1.45rem] leading-[1.95] tracking-wide text-[var(--ink)] sm:text-[1.6rem]";

  return (
    <div className="flex flex-col gap-5">
      <div className={arabicClass} lang="ar" dir="rtl">
        {renderLinkedArabic(arabic, links)}
      </div>

      {transliteration ? (
        <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">
          {transliteration}
        </p>
      ) : null}

      {hasTranslation ? (
        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5">
          <button
            type="button"
            onClick={() => setShowTranslation((value) => !value)}
            className="self-start text-sm text-[var(--accent)] hover:underline"
            aria-expanded={showTranslation}
          >
            {showTranslation ? "Hide translation" : "Show translation"}
          </button>
          {showTranslation ? (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)] sm:text-base">
              {translation}
            </p>
          ) : null}
        </div>
      ) : null}

      {links.length > 0 ? (
        <p className="text-xs text-[var(--ink-muted)]">
          Underlined Arabic jumps to linked vocabulary or structures.
        </p>
      ) : null}
    </div>
  );
}
