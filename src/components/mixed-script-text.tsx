"use client";

import { splitScriptRuns } from "@/lib/mixed-script";

type MixedScriptTextProps = {
  text: string;
  variant?: "dialogue" | "study" | "inline";
  className?: string;
};

export function MixedScriptText({
  text,
  variant = "dialogue",
  className = "",
}: MixedScriptTextProps) {
  const runs = splitScriptRuns(text);
  if (runs.length === 0) {
    return null;
  }

  const arabicClass =
    variant === "dialogue"
      ? "font-arabic text-[1.35rem] leading-[1.85] text-[var(--ink)] sm:text-[1.45rem]"
      : variant === "study"
        ? "font-arabic text-lg leading-relaxed text-[var(--ink)]"
        : "font-arabic text-base leading-relaxed text-[var(--ink)]";

  const latinClass =
    variant === "dialogue"
      ? "font-sans text-sm leading-relaxed text-[var(--ink-muted)]"
      : "font-sans text-sm leading-relaxed text-[var(--ink-muted)]";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {runs.map((run, index) =>
        run.script === "arabic" ? (
          <p
            key={`${run.script}-${index}`}
            className={arabicClass}
            lang="ar"
            dir="rtl"
          >
            {run.text}
          </p>
        ) : (
          <p
            key={`${run.script}-${index}`}
            className={latinClass}
            dir="ltr"
          >
            {run.text}
          </p>
        ),
      )}
    </div>
  );
}
