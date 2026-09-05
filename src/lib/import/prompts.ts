import {
  IMPORT_BUNDLE_MAX_ITEMS,
  IMPORT_BUNDLE_SCHEMA_TEXT,
  IMPORT_BUNDLE_VERSION,
  type ImportBundle,
} from "./bundle";
import type { ImportOrigin } from "./origin";

export const PROMPT_EXAMPLE_BUNDLE: ImportBundle = {
  version: IMPORT_BUNDLE_VERSION,
  source: {
    title: "lesson notes",
    notes: "Extracted from messy class notes",
    origin: "lesson",
    value: "high",
  },
  items: [
    {
      type: "vocabulary",
      arabic: "حرّك",
      present: "يحرّك",
      part_of_speech: "verb",
      glosses: [{ text: "move", lang: "en" }],
    },
    {
      type: "vocabulary",
      arabic: "كتاب",
      plural: "كتب",
      part_of_speech: "noun",
      glosses: [{ text: "book", lang: "en" }],
    },
    {
      type: "vocabulary",
      arabic: "مبارح",
      part_of_speech: "other",
      glosses: [{ text: "yesterday", lang: "en" }],
      tags: ["time"],
    },
    {
      type: "structure",
      name: "كنت عم + verb",
      arabic_form: "كنت عم",
      meaning: "used for ongoing action in the past",
      explanation: "Literally was + عم + verb. Used for ongoing action in the past.",
    },
    {
      type: "example",
      arabic: "شو كنت عم تعمل؟",
      translation: "What were you doing?",
      tags: ["past"],
      structure_names: ["كنت عم + verb"],
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
- Set part_of_speech on every vocabulary item: verb, noun, or other.
- Verbs always get both citation forms. arabic is past (he). present is present (he). These forms are often irregular, so never leave present empty. Example: arabic "حرّك", present "يحرّك". Keep the source prefix (يـ or Levantine بـ).
- Nouns always get both citation forms. arabic is singular. plural is the plural. Plurals are often irregular, so never leave plural empty.
- If the source writes both on one line ("حرّك - يحرّك" or "كتاب / كتب"), split them into the two fields. Do not leave both in arabic.
- Particles, adverbs, and other: arabic only. No present or plural.
- Example needs arabic. translation is optional.
- Structure needs name. arabic_form, meaning, and explanation help.
- If a chunk meaning is not word-for-word, emit a structure with explanation (literal vs used-for) and the sentence as an example. Set that example's structure_names to the structure name.
- Text needs title and arabic.
- Set source.origin to lesson, native, book, or generated. Set source.value to high, mid, or low.
- Lesson and native default to high. Generated defaults to low. Book is high unless it is a bulk glossary dump (mid).
- Do not invent rows. If a row is model-made, origin is generated and value is low.
- Do not invent graph UUIDs. You may set structure_names on an example to names of structure items in this same bundle.

Schema:
${IMPORT_BUNDLE_SCHEMA_TEXT}

Example output:
${JSON.stringify(PROMPT_EXAMPLE_BUNDLE, null, 2)}`;

export type ImportPrompt = {
  id:
    | "lesson-transcript"
    | "messy-notes"
    | "vocab-list"
    | "examples"
    | "scene-clip";
  title: string;
  summary: string;
  origin: ImportOrigin;
  text: string;
};

export const IMPORT_PROMPTS: ImportPrompt[] = [
  {
    id: "lesson-transcript",
    title: "Lesson transcript",
    summary:
      "Corpus lesson dialogue plus study hints → vocabulary, examples, structures (review before commit).",
    origin: "lesson",
    text: `${RULES}

Task: The user will attach a lesson export from the corpus app (dialogue with Tutor/You turns, optional heuristic study pack). Extract high-value corpus items only:
- Prioritize production gaps, tutor corrections, contrast pairs, and natural chunks — not every word said.
- Non-compositional chunks (فاتني = I missed, lit. it went over me) are structures with explanation, plus the sentence as a linked example.
- Cap roughly: 5–10 vocabulary, 3–8 examples, 2–4 structures. Drop filler and English meta-talk.
- Use source.title from the lesson heading in the export. Set source.origin to lesson and source.value to high.
- Do not invent rows not supported by the transcript. Put [verify] in notes when Arabic may be wrong.
- Patterns are not ImportBundle items — skip word-formation pattern rows.
Return one ImportBundle.`,
  },
  {
    id: "messy-notes",
    title: "Messy notes",
    summary: "Mixed vocab, examples, structures, and short texts. Verbs get past and present. Nouns get singular and plural.",
    origin: "lesson",
    text: `${RULES}

Task: The user will attach or paste chaotic lesson notes, screenshots transcribed as text, or mixed lists. Classify each useful row as vocabulary, example, structure, or text. For vocabulary, set part_of_speech and both citation forms. Set source.origin to lesson and source.value to high. Return one ImportBundle.`,
  },
  {
    id: "vocab-list",
    title: "Vocab list",
    summary: "Word plus gloss lists. Verbs get past and present. Nouns get singular and plural.",
    origin: "lesson",
    text: `${RULES}

Task: The user will attach or paste a vocabulary list (two columns, bullets, Anki-like lines). Emit only vocabulary items. Split multiple glosses into the glosses array. Every verb must include present. Every noun must include plural. Set source.origin to lesson and source.value to high unless you invented the rows (then generated / low). Return one ImportBundle.`,
  },
  {
    id: "examples",
    title: "Examples",
    summary: "Sentence plus translation lists.",
    origin: "lesson",
    text: `${RULES}

Task: The user will attach or paste example sentences with optional translations. Emit only example items. Keep each sentence as one item. Set source.origin to lesson and source.value to high unless you invented the rows (then generated / low). Return one ImportBundle.`,
  },
  {
    id: "scene-clip",
    title: "Scene clip",
    summary: "60–120 s native transcript. One text, then juicy lines as examples.",
    origin: "native",
    text: `${RULES}

Task: The user will paste a short Levantine scene (sketch clip, cooking step, tutor roleplay, or one Shwayy-style answer block). Emit one text with title plus arabic. Split speaker turns onto separate lines in arabic. Put English on matching translation lines if present. Add 3–8 example items only for lines worth retrieving. Tag city (lebanese, syrian, palestinian, jordanian) when known. Set source to a stable slug such as buqat-daw s3 sketch-shop or tutor-2026-08-16-pharmacy. Set source.origin to native and source.value to high. Keep dialect. Drop MSA rewrite. Return one ImportBundle.`,
  },
];
