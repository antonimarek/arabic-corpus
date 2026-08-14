"use client";

import { useState } from "react";

import { enrollExample } from "@/app/(app)/today/actions";

export function LearnExampleButton({
  exampleId,
  enrolled,
}: {
  exampleId: string;
  enrolled: boolean;
}) {
  const [done, setDone] = useState(enrolled);
  const [message, setMessage] = useState<string | null>(
    enrolled ? "In review" : null,
  );

  if (done) {
    return <span className="text-sm text-[var(--ink-muted)]">{message}</span>;
  }

  return (
    <button
      type="button"
      className="text-sm text-[var(--accent)] hover:underline"
      onClick={async () => {
        const result = await enrollExample(exampleId);
        if (result.error) {
          setMessage(result.error);
          return;
        }
        setDone(true);
        setMessage(
          result.deferred ? "Daily new cap reached. Due tomorrow." : "In review",
        );
      }}
    >
      Learn
    </button>
  );
}
