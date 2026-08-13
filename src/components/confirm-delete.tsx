"use client";

import { useState } from "react";

type ConfirmDeleteProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function ConfirmDelete({ action }: ConfirmDeleteProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[var(--danger)] hover:underline"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-3">
      <button
        type="submit"
        className="text-[var(--danger)] hover:underline"
      >
        Confirm
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-[var(--ink-muted)] hover:underline"
      >
        Cancel
      </button>
    </form>
  );
}
