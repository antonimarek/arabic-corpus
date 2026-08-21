export type ManualModule = {
  id: string;
  title: string;
  body: string;
  href?: string;
};

/** How to use each main module. Keep short. STE-flavored. */
export const MANUAL_MODULES: ManualModule[] = [
  {
    id: "today",
    title: "Today",
    body: "Timed session on one text with audio. Listen, read, retrieve examples, then fluency. This is the daily spine.",
    href: "/today",
  },
  {
    id: "search",
    title: "Search",
    body: "Find texts, examples, vocabulary, and structures. Capture a sentence from the home page when you meet something new.",
    href: "/",
  },
  {
    id: "texts",
    title: "Texts",
    body: "Scenes with Arabic and optional audio. Mark focus words. Stamp line starts while you listen. Today picks from these.",
    href: "/texts",
  },
  {
    id: "examples",
    title: "Examples",
    body: "Real sentences. Enroll ones you want to retrieve. FSRS schedules them in Today.",
    href: "/examples",
  },
  {
    id: "vocabulary",
    title: "Vocabulary",
    body: "Individual words with senses, citation forms, and optional root. Same-root siblings show as a family.",
    href: "/vocabulary",
  },
  {
    id: "patterns",
    title: "Patterns",
    body: "Word-formation moves inside words (علم → علّم). Prefer Suggestions from a batch discover run; connect pairs by hand only as fallback. Not a grammar textbook.",
    href: "/patterns",
  },
  {
    id: "structures",
    title: "Structures",
    body: "Phrase frames and chunks (بدي + فعل, عم + …). How people build sentences, not how stems change.",
    href: "/structures",
  },
  {
    id: "import",
    title: "Import",
    body: "Bring bulk Levantine material through review, then commit. See Sources for what belongs in the corpus.",
    href: "/import",
  },
];

export const MANUAL_LAYERS = [
  {
    title: "Vocabulary",
    body: "Single words you meet in scenes.",
  },
  {
    title: "Patterns",
    body: "Shared moves across words you already know.",
  },
  {
    title: "Structures",
    body: "How phrases and clauses are built.",
  },
  {
    title: "Examples",
    body: "Real use in context. This is what you retrieve.",
  },
] as const;
