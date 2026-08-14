"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { rankSession, type SessionBudget } from "@/lib/session";
import type { SessionTextCandidate } from "@/lib/session";
import { readLastText } from "@/lib/prefs";
import { readLastFinishedText, readSessionProgress } from "@/lib/session-prefs";

export function TodayRedirect({
  candidates,
  budget,
}: {
  candidates: SessionTextCandidate[];
  budget: SessionBudget;
}) {
  const router = useRouter();

  useEffect(() => {
    const progress = readSessionProgress();
    const last = readLastText();
    const finished = readLastFinishedText();
    const ranked = rankSession({
      texts: candidates,
      lastTextId: progress?.textId ?? last?.id ?? null,
      lastUnfinished: Boolean(progress),
    });
    if (!ranked.ok) {
      router.replace("/");
      return;
    }
    const finishedParam =
      finished?.id && finished.id !== ranked.text.id
        ? `&finished=${finished.id}`
        : "";
    router.replace(`/today?m=${budget}&text=${ranked.text.id}${finishedParam}`);
  }, [budget, candidates, router]);

  return (
    <p className="text-sm text-[var(--ink-muted)]">Opening today…</p>
  );
}
