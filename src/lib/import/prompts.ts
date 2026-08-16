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
- For verbs, arabic is past (he). Put present (he) in present.
- For nouns, arabic is singular. Put the plural in plural.
- Example needs arabic. translation is optional.
- Structure needs name. arabic_form and meaning help.
- Text needs title and arabic.
- Do not invent graph links or ids.

Schema:
${IMPORT_BUNDLE_SCHEMA_TEXT}

Example output:
${JSON.stringify(PROMPT_EXAMPLE_BUNDLE, null, 2)}`;

export type ImportPrompt = {
  id: "messy-notes" | "vocab-list" | "examples" | "scene-clip";
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
  {
    id: "scene-clip",
    title: "Scene clip",
    summary: "60–120 s native transcript. One text, then juicy lines as examples.",
    text: `${RULES}

Task: The user will paste a short Levantine scene (sketch clip, cooking step, tutor roleplay, or one Shwayy-style answer block). Emit one text with title plus arabic. Split speaker turns onto separate lines in arabic. Put English on matching translation lines if present. Add 3–8 example items only for lines worth retrieving. Tag city (lebanese, syrian, palestinian, jordanian) when known. Set source to a stable slug such as buqat-daw s3 sketch-shop or tutor-2026-08-16-pharmacy. Keep dialect. Drop MSA rewrite. Return one ImportBundle.`,
  },
];
