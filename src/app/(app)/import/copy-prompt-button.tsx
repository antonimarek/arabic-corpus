"use client";

import { useState } from "react";

export function CopyPromptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="min-h-11 rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] hover:border-[var(--accent)]"
    >
      {copied ? "Copied" : "Copy prompt"}
    </button>
  );
}
