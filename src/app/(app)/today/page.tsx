import { TodayRedirect } from "@/components/today-redirect";
import { TodaySession } from "@/components/today-session";
import { parseSessionBudget } from "@/lib/session";
import {
  loadDueCards,
  loadFluencyText,
  loadLearnCandidates,
  loadSessionCandidates,
} from "@/lib/session-data";
import { fetchTextDetailCached } from "@/lib/text-detail-cached";
import { createClient } from "@/lib/supabase/server";

type TodayPageProps = {
  searchParams: Promise<{ m?: string; text?: string; finished?: string }>;
};

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const { m, text: textId, finished } = await searchParams;
  const budget = parseSessionBudget(m);
  const supabase = await createClient();
  const candidates = await loadSessionCandidates(supabase);

  if (!textId) {
    return <TodayRedirect candidates={candidates} budget={budget} />;
  }

  let detail: Awaited<ReturnType<typeof fetchTextDetailCached>>;
  try {
    detail = await fetchTextDetailCached(textId);
  } catch {
    return <TodayRedirect candidates={candidates} budget={budget} />;
  }

  if (!detail.audioUrl) {
    return <TodayRedirect candidates={candidates} budget={budget} />;
  }

  const [dueCards, learnCandidates, fluency] = await Promise.all([
    loadDueCards(supabase),
    loadLearnCandidates(supabase, textId),
    finished ? loadFluencyText(supabase, finished) : Promise.resolve(null),
  ]);

  return (
    <TodaySession
      budget={budget}
      text={detail}
      dueCards={dueCards}
      learnCandidates={learnCandidates}
      fluency={fluency}
    />
  );
}
