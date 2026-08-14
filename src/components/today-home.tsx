"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { rankSession, SESSION_BUDGETS, type SessionBudget } from "@/lib/session";
import type { SessionTextCandidate } from "@/lib/session";
import { readLastText } from "@/lib/prefs";
import {
  readLastFinishedText,
  readSessionBudget,
  readSessionProgress,
  writeSessionBudget,
} from "@/lib/session-prefs";

type TodayPrefs = {
  budget: SessionBudget;
  lastTextId: string | null;
  unfinished: boolean;
  finishedId: string | null;
};

const SERVER_PREFS: TodayPrefs = {
  budget: 15,
  lastTextId: null,
  unfinished: false,
  finishedId: null,
};

function readTodayPrefs(): TodayPrefs {
  if (typeof window === "undefined") return SERVER_PREFS;
  const progress = readSessionProgress();
  return {
    budget: readSessionBudget(),
    lastTextId: progress?.textId ?? readLastText()?.id ?? null,
    unfinished: Boolean(progress),
    finishedId: readLastFinishedText()?.id ?? null,
  };
}

function subscribeTodayPrefs(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function TodayHome({
  candidates,
}: {
  candidates: SessionTextCandidate[];
}) {
  const prefs = useSyncExternalStore(
    subscribeTodayPrefs,
    readTodayPrefs,
    () => SERVER_PREFS,
  );
  const [budgetOverride, setBudgetOverride] = useState<SessionBudget | null>(
    null,
  );
  const budget = budgetOverride ?? prefs.budget;

  const ranked = rankSession({
    texts: candidates,
    lastTextId: prefs.lastTextId,
    lastUnfinished: prefs.unfinished,
  });

  const pickBudget = (value: SessionBudget) => {
    setBudgetOverride(value);
    writeSessionBudget(value);
  };

  if (!ranked.ok) {
    const firstText = candidates[0];
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-[var(--ink-muted)]">Today</h2>
        <p className="text-[15px] text-[var(--ink)]">
          Add audio to a text. Today starts with a voice note.
        </p>
        <Link
          href={firstText ? `/texts/${firstText.id}` : "/texts/new"}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          {firstText ? "Add audio to a text" : "Add a text"}
        </Link>
      </section>
    );
  }

  const startHref = prefs.finishedId
    ? `/today?m=${budget}&text=${ranked.text.id}&finished=${prefs.finishedId}`
    : `/today?m=${budget}&text=${ranked.text.id}`;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-[var(--ink-muted)]">Today</h2>
      <div className="flex flex-wrap gap-2">
        {SESSION_BUDGETS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={budget === value}
            onClick={() => pickBudget(value)}
            className={`min-h-11 rounded-md px-3 py-2 text-sm ${
              budget === value
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] text-[var(--ink)]"
            }`}
          >
            {value} min
          </button>
        ))}
      </div>
      <p className="text-[15px] text-[var(--ink)]">{ranked.reason}</p>
      <Link
        href={startHref}
        className="self-start rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
      >
        Start · {ranked.text.title}
      </Link>
    </section>
  );
}
