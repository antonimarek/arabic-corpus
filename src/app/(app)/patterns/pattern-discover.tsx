"use client";

import { useState } from "react";

type Pair = { from: string; to: string };

type PatternDiscoverProps = {
  pairs: Pair[];
  memberArabic: string[];
  cue: string | null;
  meaningShift: string | null;
};

export function PatternDiscover({
  pairs,
  memberArabic,
  cue,
  meaningShift,
}: PatternDiscoverProps) {
  const [revealed, setRevealed] = useState(false);
  const hasReveal = Boolean(cue || meaningShift);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm text-[var(--ink-muted)]">Notice the move</h2>
      {pairs.length > 0 ? (
        <ul className="flex flex-col gap-3" dir="rtl">
          {pairs.map((pair) => (
            <li
              key={`${pair.from}-${pair.to}`}
              className="font-arabic text-xl leading-relaxed text-[var(--ink)]"
              lang="ar"
            >
              <span>{pair.from}</span>
              <span className="mx-2 text-[var(--ink-muted)]" dir="ltr">
                →
              </span>
              <span>{pair.to}</span>
            </li>
          ))}
        </ul>
      ) : memberArabic.length > 0 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-2" dir="rtl">
          {memberArabic.map((arabic) => (
            <li
              key={arabic}
              className="font-arabic text-xl text-[var(--ink)]"
              lang="ar"
            >
              {arabic}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">
          Link words you already know. Then compare them here.
        </p>
      )}

      {hasReveal ? (
        revealed ? (
          <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4">
            {cue ? (
              <p className="text-[15px] text-[var(--ink)]">
                <span className="text-[var(--ink-muted)]">Cue: </span>
                {cue}
              </p>
            ) : null}
            {meaningShift ? (
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)]">
                {meaningShift}
              </p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="self-start text-sm text-[var(--accent)] hover:underline"
          >
            What do these have in common?
          </button>
        )
      ) : null}
    </section>
  );
}
