export type ScriptRun = {
  script: "arabic" | "latin";
  text: string;
};

const ARABIC_RE = /[\u0600-\u06FF]/;
const ARABIC_CHAR_RE = /[\u0600-\u06FF]/u;
const LATIN_CHAR_RE = /[A-Za-z0-9]/;

function isArabicChar(char: string): boolean {
  return ARABIC_CHAR_RE.test(char);
}

function isLatinChar(char: string): boolean {
  return LATIN_CHAR_RE.test(char);
}

function scriptForChar(char: string): "arabic" | "latin" | null {
  if (isArabicChar(char)) return "arabic";
  if (isLatinChar(char)) return "latin";
  return null;
}

/** Strip dialogue role prefixes before splitting mixed text. */
export function stripDialogueRolePrefix(text: string): string {
  return text.replace(/^\[(TUTOR|STUDENT)\]\s*/u, "").trim();
}

export function splitScriptRuns(text: string): ScriptRun[] {
  const normalized = stripDialogueRolePrefix(text).replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const runs: ScriptRun[] = [];
  let current: ScriptRun | null = null;

  for (const char of normalized) {
    const script = scriptForChar(char);
    if (!script) {
      if (current) current.text += char;
      continue;
    }
    if (!current || current.script !== script) {
      if (current?.text.trim()) {
        runs.push({ script: current.script, text: current.text.trim() });
      }
      current = { script, text: char };
      continue;
    }
    current.text += char;
  }

  if (current?.text.trim()) {
    runs.push({ script: current.script, text: current.text.trim() });
  }

  return runs;
}

export function extractArabicRuns(text: string): string[] {
  return splitScriptRuns(text)
    .filter((run) => run.script === "arabic")
    .map((run) => run.text);
}

export function extractLatinRuns(text: string): string[] {
  return splitScriptRuns(text)
    .filter((run) => run.script === "latin")
    .map((run) => run.text);
}

export function longestArabicRun(text: string): string {
  const runs = extractArabicRuns(text);
  if (runs.length === 0) return "";
  return runs.reduce((longest, run) => (run.length > longest.length ? run : longest), "");
}

export function longestLatinRun(text: string): string {
  const runs = extractLatinRuns(text);
  if (runs.length === 0) return "";
  return runs.reduce((longest, run) => (run.length > longest.length ? run : longest), "");
}

export function hasArabicScript(text: string): boolean {
  return ARABIC_RE.test(text);
}
