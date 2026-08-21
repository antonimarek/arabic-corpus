export type BuildInfo = {
  builtAtIso: string | null;
  shortSha: string | null;
  /** Compact label for the shell corner. */
  label: string;
  /** Full tooltip / title. */
  detail: string;
};

function formatBuiltAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Server-side build stamp. Prefer deploy bake time, then git sha. */
export function getBuildInfo(): BuildInfo {
  const builtAtIso = process.env.NEXT_PUBLIC_APP_BUILT_AT?.trim() || null;
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;
  const shortSha = sha ? sha.slice(0, 7) : null;

  if (builtAtIso) {
    const formatted = formatBuiltAt(builtAtIso);
    return {
      builtAtIso,
      shortSha,
      label: shortSha ? `${formatted} · ${shortSha}` : formatted,
      detail: shortSha
        ? `Built ${builtAtIso} · commit ${shortSha}`
        : `Built ${builtAtIso}`,
    };
  }

  if (shortSha) {
    return {
      builtAtIso: null,
      shortSha,
      label: `git ${shortSha}`,
      detail: `Commit ${shortSha}`,
    };
  }

  return {
    builtAtIso: null,
    shortSha: null,
    label: "dev",
    detail: "Local or unknown build",
  };
}
