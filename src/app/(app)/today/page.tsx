import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Suspense } from "react";

import {
  DailySessionSkeleton,
  DailySessionView,
} from "@/components/daily-session";
import { TodaySession } from "@/components/today-session";
import { loadDailySession } from "@/lib/daily-session";
import {
  parseSessionBudget,
  parseTodayHint,
  rankSession,
  TODAY_HINT_COOKIE,
} from "@/lib/session";
import {
  loadDueCards,
  loadFluencyText,
  loadLearnCandidates,
  loadSessionCandidates,
} from "@/lib/session-data";
import { createClient } from "@/lib/supabase/server";
import { fetchTextDetailCached } from "@/lib/text-detail-cached";

type TodayPageProps = {
  searchParams: Promise<{
    m?: string;
    text?: string;
    finished?: string;
    mode?: string;
  }>;
};

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const [{ m, text: textParam, finished, mode }, cookieStore, supabase] =
    await Promise.all([searchParams, cookies(), createClient()]);

  // Default: the capped daily card session. Text flows are secondary modes.
  if (!textParam && mode !== "text" && mode !== "fluency") {
    return (
      <Suspense fallback={<DailySessionSkeleton />}>
        <DailySessionView session={loadDailySession(supabase)} />
      </Suspense>
    );
  }
  const budget = parseSessionBudget(m);
  const hint = parseTodayHint(cookieStore.get(TODAY_HINT_COOKIE)?.value);

  // Cards don't depend on the text: start them before anything else.
  const dueCards = loadDueCards(supabase);

  let textId = textParam ?? null;
  if (!textId) {
    // Pick on the server (was a client redirect = a second full request).
    const ranked = rankSession({
      texts: await loadSessionCandidates(supabase),
      lastTextId: hint.lastTextId,
      lastUnfinished: hint.unfinished,
    });
    if (!ranked.ok) redirect("/today");
    textId = ranked.text.id;
  }

  const finishedId = finished ?? hint.finishedId;
  const learnCandidates = loadLearnCandidates(supabase, textId);
  const fluency =
    finishedId && finishedId !== textId
      ? loadFluencyText(supabase, finishedId)
      : Promise.resolve(null);
  // Avoid unhandled rejections if we redirect before these are consumed.
  for (const p of [dueCards, learnCandidates, fluency]) p.catch(() => {});

  const detail = await fetchTextDetailCached(textId).catch(() => null);
  if (!detail?.audioUrl) {
    if (textParam) redirect(`/today?mode=text&m=${budget}`);
    redirect("/today");
  }

  return (
    <TodaySession
      budget={budget}
      text={detail}
      dueCards={dueCards}
      learnCandidates={learnCandidates}
      fluency={fluency}
      onlySteps={
        mode === "fluency"
          ? ["fluency"]
          : mode === "text"
            ? ["listen", "read"]
            : undefined
      }
    />
  );
}
