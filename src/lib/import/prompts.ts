import {
  IMPORT_BUNDLE_MAX_ITEMS,
  IMPORT_BUNDLE_SCHEMA_TEXT,
  IMPORT_BUNDLE_VERSION,
  type ImportBundle,
} from "./bundle";

export const PROMPT_EXAMPLE_BUNDLE: ImportBundle = {
  version: IMPORT_BUNDLE_VERSION,
  source: {
    title: "lesson notes",
    notes: "Extracted from messy class notes",
  },
  items: [
    {
      type: "vocabulary",
      arabic: "مبارح",
      glosses: [{ text: "yesterday", lang: "en" }],
      tags: ["time"],
    },
    {
      type: "structure",
      name: "كنت عم + verb",
      arabic_form: "كنت عم",
      meaning: "used for ongoing action in the past",
    },
    {
      type: "example",
      arabic: "شو كنت عم تعمل؟",
      translation: "What were you doing?",
      tags: ["past"],
    },
  ],
};

const RULES = `You extract Levantine Arabic study material into ImportBundle JSON for a personal corpus.

Rules:
- Keep original Levantine Arabic exact. Do not rewrite into MSA.
- Do not add vocalization unless the source already has it.
- Output only JSON. No markdown fences. No commentary.
- version must be ${IMPORT_BUNDLE_VERSION}.
- At most ${IMPORT_BUNDLE_MAX_ITEMS} items.
- Drop empty rows, chat meta, and duplicates inside this file.
- Vocabulary needs arabic plus at least one gloss (or translation).
- Example needs arabic. translation is optional.
- Structure needs name. arabic_form and meaning help.
- Text needs title and arabic.
- Do not invent graph links or ids.

Schema:
${IMPORT_BUNDLE_SCHEMA_TEXT}

Example output:
${JSON.stringify(PROMPT_EXAMPLE_BUNDLE, null, 2)}`;

export type ImportPrompt = {
  id: "messy-notes" | "vocab-list" | "examples";
  title: string;
  summary: string;
  text: string;
};

export const IMPORT_PROMPTS: ImportPrompt[] = [
  {
    id: "messy-notes",
    title: "Messy notes",
    summary: "Mixed vocab, examples, structures, and short texts.",
    text: `${RULES}

Task: The user will attach or paste chaotic lesson notes, screenshots transcribed as text, or mixed lists. Classify each useful row as vocabulary, example, structure, or text. Return one ImportBundle.`,
  },
  {
    id: "vocab-list",
    title: "Vocab list",
    summary: "Word plus gloss lists.",
    text: `${RULES}

Task: The user will attach or paste a vocabulary list (two columns, bullets, Anki-like lines). Emit only vocabulary items. Split multiple glosses into the glosses array. Return one ImportBundle.`,
  },
  {
    id: "examples",
    title: "Examples",
    summary: "Sentence plus translation lists.",
    text: `${RULES}

Task: The user will attach or paste example sentences with optional translations. Emit only example items. Keep each sentence as one item. Return one ImportBundle.`,
  },
];
