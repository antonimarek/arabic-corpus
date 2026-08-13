"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type MenuState = {
  text: string;
  top: number;
  left: number;
};

type ArabicSelectionMenuProps = {
  children: ReactNode;
  className?: string;
  textId?: string;
  lineNumber?: number;
};

export function ArabicSelectionMenu({
  children,
  className,
  textId,
  lineNumber,
}: ArabicSelectionMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  const close = useCallback(() => setMenu(null), []);

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

  const onPointerUp = () => {
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
    setMenu({
      text,
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  };

  const encoded = menu ? encodeURIComponent(menu.text) : "";
  const exampleParams = new URLSearchParams();
  if (menu) {
    exampleParams.set("arabic", menu.text);
    if (textId) exampleParams.set("text", textId);
    if (textId && lineNumber != null) {
      exampleParams.set("line", String(lineNumber));
    }
  }

  return (
    <>
      <div ref={rootRef} className={className} onPointerUp={onPointerUp}>
        {children}
      </div>
      {menu ? (
        <div
          ref={menuRef}
          data-selection-menu
          className="fixed z-30 min-w-44 rounded-md border border-[var(--line)] bg-[var(--surface)] py-1 text-start text-sm"
          style={{
            top: menu.top,
            left: menu.left,
            transform: "translateX(-50%)",
          }}
          dir="ltr"
        >
          <Link
            href={`/?q=${encoded}`}
            className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
            onClick={close}
          >
            Search corpus
          </Link>
          <Link
            href={`/vocabulary/new?arabic=${encoded}`}
            className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
            onClick={close}
          >
            Add vocabulary
          </Link>
          <Link
            href={`/examples/new?${exampleParams.toString()}`}
            className="block px-3 py-2.5 hover:bg-[var(--surface-hover)]"
            onClick={close}
          >
            Add example
          </Link>
        </div>
      ) : null}
    </>
  );
}
