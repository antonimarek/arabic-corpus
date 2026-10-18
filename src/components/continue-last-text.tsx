"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { usePrefetchTextDetail } from "@/lib/prefetch-text-detail";
import {
  getLastTextServerSnapshot,
  readLastText,
  subscribeLastText,
} from "@/lib/prefs";

export function ContinueLastText() {
  const last = useSyncExternalStore(
    subscribeLastText,
    readLastText,
    getLastTextServerSnapshot,
  );
  const prefetch = usePrefetchTextDetail();

  if (!last) return null;

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-medium text-[var(--ink-muted)]">Continue</h2>
      <Link
        href={`/texts/${last.id}`}
        className="text-[15px] text-[var(--ink)] hover:text-[var(--accent)]"
        onMouseEnter={() => prefetch(last.id)}
        onFocus={() => prefetch(last.id)}
        onTouchStart={() => prefetch(last.id)}
      >
        {last.title}
      </Link>
    </div>
  );
}
