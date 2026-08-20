"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { lookupPhrase, type PhraseHit } from "@/app/(app)/lookup/actions";
import { attachVocabularyForm } from "@/app/(app)/vocabulary/actions";
import { arwordsSearchUrl } from "@/lib/arwords";
import type { ArabicLink } from "@/lib/highlight-arabic";

type NoticeApi = {
  onPhraseActivate: (
    link: ArabicLink,
    rect: DOMRect,
    surface: string,
  ) => void;
};

type MenuState =
  | {
      mode: "selection";
      text: string;
      top: number;
      left: number;
      hits: PhraseHit[];
      suggestions: PhraseHit[];
      looking: boolean;
    }
  | {
      mode: "phrase";
      text: string;
      stored: string;
      top: number;
      left: number;
      link: ArabicLink;
    };

type ArabicSelectionMenuProps = {
  children: ReactNode | ((api: NoticeApi) => ReactNode);
  className?: string;
  textId?: string;
  lineNumber?: number;
  lineTranslation?: string | null;
};

function exampleHref(
  arabic: string,
  textId?: string,
  lineNumber?: number,
): string {
  const params = new URLSearchParams();
  params.set("arabic", arabic);
  if (textId) params.set("text", textId);
  if (textId && lineNumber != null) {
    params.set("line", String(lineNumber));
  }
  return `/examples/new?${params.toString()}`;
}

export function ArabicSelectionMenu({
  children,
  className,
  textId,
  lineNumber,
  lineTranslation,
}: ArabicSelectionMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  const close = useCallback(() => setMenu(null), []);

  const onPhraseActivate = useCallback(
    (link: ArabicLink, rect: DOMRect, surface: string) => {
      setMenu({
        mode: "phrase",
        text: surface,
        stored: link.phrase,
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
        link,
      });
    },
    [],
  );

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || rootRef.current?.contains(target)) {
        return;
      }
      close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [close]);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el || !menu) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let x = 0;
    let y = 0;
    if (rect.left < pad) x = pad - rect.left;
    if (rect.right > window.innerWidth - pad) {
      x = window.innerWidth - pad - rect.right;
    }
    if (rect.bottom > window.innerHeight - pad) {
      y = -(rect.height + 16);
    }
    el.style.transform = `translateX(calc(-50% + ${x}px)) translateY(${y}px)`;
  }, [menu]);

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-arabic-phrase]")) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }
    const text = selection.toString().trim();
    if (!text) return;
    const range = selection.getRangeAt(0);
    const root = rootRef.current;
    if (!root || !root.contains(range.commonAncestorContainer)) {
      return;
    }
    const rect = range.getBoundingClientRect();
    const next: MenuState = {
      mode: "selection",
      text,
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
      hits: [],
      suggestions: [],
      looking: true,
    };
    setMenu(next);
    void lookupPhrase(text).then((result) => {
      setMenu((current) => {
        if (
          !current ||
          current.mode !== "selection" ||
          current.text !== text
        ) {
          return current;
        }
        return {
          ...current,
          hits: result.hits,
          suggestions: result.suggestions,
          looking: false,
        };
      });
    });
  };

  const encoded = menu ? encodeURIComponent(menu.text) : "";
  const addExampleHref = menu
    ? exampleHref(menu.text, textId, lineNumber)
    : "/examples/new";
  const arwordsHref = menu ? arwordsSearchUrl(menu.text) : "https://www.arwords.com/words";
  const lineGloss = lineTranslation?.trim() || null;
  const vocabHits =
    menu?.mode === "selection"
      ? menu.hits.filter((hit) => hit.type === "vocabulary")
      : [];
  const structureHits =
    menu?.mode === "selection"
      ? menu.hits.filter((hit) => hit.type === "structure")
      : [];

  return (
    <>
      <div ref={rootRef} className={className} onPointerUp={onPointerUp}>
        {typeof children === "function"
          ? children({ onPhraseActivate })
          : children}
      </div>
      {menu ? (
        <div
          ref={menuRef}
          data-selection-menu
          className="fixed z-30 min-w-44 max-w-[min(18rem,calc(100vw-16px))] rounded-md border border-[var(--line)] bg-[var(--surface)] py-1 text-start text-sm"
          style={{
            top: menu.top,
            left: menu.left,
            transform: "translateX(-50%)",
          }}
          dir="ltr"
        >
          {menu.mode === "phrase" ? (
            <>
              <p
                className="font-arabic px-3 pt-2.5 pb-1 text-lg leading-relaxed text-[var(--ink)]"
                lang="ar"
                dir="rtl"
              >
                {menu.text}
              </p>
              {menu.stored !== menu.text ? (
                <p
                  className="font-arabic px-3 pb-1 text-sm text-[var(--ink-muted)]"
                  lang="ar"
                  dir="rtl"
                >
                  {menu.stored}
                </p>
              ) : null}
              {menu.link.gloss ? (
                <p className="px-3 pb-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">
                  {menu.link.gloss}
                </p>
              ) : null}
              {lineGloss ? (
                <p className="px-3 pb-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">
                  <span className="block text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                    This line
                  </span>
                  {lineGloss}
                </p>
              ) : null}
              <Link
                href={menu.link.href}
                className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
                onClick={close}
              >
                Open
              </Link>
              <a
                href={arwordsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
                onClick={close}
              >
                Arabic Words
              </a>
              <Link
                href={addExampleHref}
                className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
                onClick={close}
              >
                Add example
              </Link>
            </>
          ) : (
            <>
              {lineGloss ? (
                <p className="border-b border-[var(--line)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--ink-muted)]">
                  <span className="mb-1 block text-[11px] uppercase tracking-wide">
                    This line
                  </span>
                  {lineGloss}
                </p>
              ) : null}
              {menu.looking ? (
                <p className="px-3 py-2.5 text-[var(--ink-muted)]">Looking…</p>
              ) : null}
              {vocabHits.map((hit) => (
                <Link
                  key={`v:${hit.id}`}
                  href={hit.href}
                  className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
                  onClick={close}
                >
                  Open {hit.arabic}
                  {hit.gloss ? (
                    <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">
                      {hit.gloss}
                    </span>
                  ) : null}
                </Link>
              ))}
              {structureHits.map((hit) => (
                <Link
                  key={`s:${hit.id}`}
                  href={hit.href}
                  className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
                  onClick={close}
                >
                  Open {hit.arabic}
                  {hit.gloss ? (
                    <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">
                      {hit.gloss}
                    </span>
                  ) : null}
                </Link>
              ))}
              <a
                href={arwordsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
                onClick={close}
              >
                Arabic Words
              </a>
              <Link
                href={`/?q=${encoded}`}
                className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
                onClick={close}
              >
                Search corpus
              </Link>
              {vocabHits.length === 0 ? (
                <Link
                  href={`/vocabulary/new?arabic=${encoded}`}
                  className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
                  onClick={close}
                >
                  Add vocabulary
                </Link>
              ) : null}
              {vocabHits.length === 0
                ? menu.suggestions.map((hit) => (
                    <form
                      key={`suggest:${hit.id}`}
                      action={attachVocabularyForm.bind(null, hit.id)}
                    >
                      <input type="hidden" name="arabic" value={menu.text} />
                      <button
                        type="submit"
                        className="block w-full px-3 py-2.5 text-start hover:bg-[var(--surface-hover)]"
                        onClick={close}
                      >
                        Add as form of {hit.arabic}
                        {hit.gloss ? (
                          <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">
                            {hit.gloss}
                          </span>
                        ) : null}
                      </button>
                    </form>
                  ))
                : null}
              {vocabHits.length === 0 ? (
                <Link
                  href={`/vocabulary/add-form?arabic=${encoded}`}
                  className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
                  onClick={close}
                >
                  Add form to existing
                </Link>
              ) : null}
              <Link
                href={addExampleHref}
                className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
                onClick={close}
              >
                Add example
              </Link>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
