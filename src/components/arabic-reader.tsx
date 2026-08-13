"use client";

import { useSyncExternalStore } from "react";

import { ArabicSelectionMenu } from "@/components/arabic-selection-menu";
import {
  renderLinkedArabic,
  type ArabicLink,
} from "@/lib/highlight-arabic";
import {
  getShowTranslationServerSnapshot,
  getShowTranslationSnapshot,
  subscribeShowTranslation,
  writeShowTranslation,
} from "@/lib/prefs";

type ArabicReaderProps = {
  arabic: string;
  translation?: string | null;
  transliteration?: string | null;
  links?: ArabicLink[];
  size?: "text" | "example";
  textId?: string;
  sourceLine?: number | null;
};

export function ArabicReader({
  arabic,
  translation,
  transliteration,
  links = [],
  size = "text",
  textId,
  sourceLine,
}: ArabicReaderProps) {
  const hasTranslation = Boolean(translation?.trim());
  const preferShow = useSyncExternalStore(
    subscribeShowTranslation,
    getShowTranslationSnapshot,
    getShowTranslationServerSnapshot,
  );
  const showTranslation = hasTranslation && preferShow;

  const toggleTranslation = () => {
    writeShowTranslation(!preferShow);
  };

  const arabicClass =
    size === "text"
      ? "font-arabic whitespace-pre-wrap text-[1.65rem] leading-[2] tracking-wide text-[var(--ink)] sm:text-[1.85rem] sm:leading-[2.05]"
      : "font-arabic whitespace-pre-wrap text-[1.45rem] leading-[1.95] tracking-wide text-[var(--ink)] sm:text-[1.6rem]";

  return (
    <div className="flex flex-col gap-5">
      <ArabicSelectionMenu
        className={arabicClass}
        textId={textId}
        lineNumber={sourceLine ?? undefined}
      >
        <div lang="ar" dir="rtl">
          {renderLinkedArabic(arabic, links)}
        </div>
      </ArabicSelectionMenu>

      {transliteration ? (
        <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">
          {transliteration}
        </p>
      ) : null}

      {hasTranslation ? (
        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5">
          <button
            type="button"
            onClick={toggleTranslation}
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
          Underlined Arabic jumps to linked vocabulary or structures. Select
          a phrase to add it.
        </p>
      ) : (
        <p className="text-xs text-[var(--ink-muted)]">
          Select Arabic to search, add vocabulary, or add an example.
        </p>
      )}
    </div>
  );
}
