export const SHWAYY_SOURCE_PREFIX = "shwayy-an-haali";

export const SOURCE_JOBS = ["spine", "stretch", "ear", "skip"] as const;
export type SourceJob = (typeof SOURCE_JOBS)[number];

export type SourceEntry = {
  id: string;
  name: string;
  job: SourceJob;
  city: string;
  owned?: boolean;
  sourcePrefix?: string;
  use: string;
  skip: string;
  how: string;
};

export const SOURCE_JOB_COPY: Record<
  SourceJob,
  { label: string; blurb: string }
> = {
  spine: {
    label: "Spine",
    blurb: "Scene with audio. Goes in the corpus. Today can pick it.",
  },
  stretch: {
    label: "Stretch",
    blurb: "Clip 60–120 s. Visual context. Harvest a few lines.",
  },
  ear: {
    label: "Ear only",
    blurb: "Full episode. Gist. No transcript. No import.",
  },
  skip: {
    label: "Skip as spine",
    blurb: "Fine to watch. Wrong register for daily talk.",
  },
};

export const SOURCE_OBJECTS = [
  {
    id: "chunks",
    title: "Chunks",
    body: "Tutor lines and typical ways people say things. Structures and examples. Retrieve and say.",
  },
  {
    id: "scenes",
    title: "Scenes",
    body: "Connected talk, 8–20 turns or one survey section. Texts with audio. Listen, then read.",
  },
  {
    id: "ear",
    title: "Ear",
    body: "Long native audio. Stays outside the corpus.",
  },
] as const;

export const WEEKLY_STEPS = [
  "One Shwayy section with its MP3, or one tutor recording.",
  "One sketch clip only if you want stretch.",
  "A long podcast only as background. Do not import it.",
] as const;

export const SOURCE_ENTRIES: SourceEntry[] = [
  {
    id: "shwayy",
    name: "Shwayy ‘An Haali",
    job: "spine",
    city: "Lebanese + Syrian",
    owned: true,
    sourcePrefix: SHWAYY_SOURCE_PREFIX,
    use: "30 survey questions. 10 native answers each. Already has script + MP3.",
    skip: "Do not dump glossary particles onto spine texts. Optional: import glossary as vocab via review.",
    how: "Import the parsed JSON. Attach the section MP3 on the text. Mark the 10 answer lines. Study one question a week. Optional: --glossary-out for vocab review import.",
  },
  {
    id: "kameen",
    name: "Kameen Shwayy ‘An Haali",
    job: "spine",
    city: "Lebanese + Syrian",
    use: "Same speakers, longer answers. Next book after this one.",
    skip: "Do not buy it before Shwayy is in the corpus.",
    how: "Same shape as Shwayy. One section = one text.",
  },
  {
    id: "voices",
    name: "Syrian / Lebanese Arabic Voices",
    job: "spine",
    city: "Pick one city",
    use: "Spontaneous audio essays with transcripts. Podcast job without a 70-minute hole.",
    skip: "Mixed-dialect Voices books. Keep Levantine speakers only.",
    how: "One essay = one text. Tag the city.",
  },
  {
    id: "tutor",
    name: "Tutor recordings",
    job: "spine",
    city: "Your variant",
    use: "Your topics, your errors in the reply.",
    skip: "Unrecorded lessons. Memory is not a source.",
    how: "Record a 10-minute roleplay. Import as a text. Link structures from the lesson.",
  },
  {
    id: "buqat",
    name: "بقعة ضوء",
    job: "stretch",
    city: "Syrian",
    use: "Shop, family, office, neighbor. One sketch is a scene.",
    skip: "Political sketches you cannot follow even with the picture.",
    how: "Watch for gist. Cut 60–120 s. ASR, then you fix. Import as a text.",
  },
  {
    id: "watan",
    name: "وطن ع وتر",
    job: "stretch",
    city: "Palestinian / Jordanian",
    use: "Short street-life sketches. Easy to clip.",
    skip: "If the punchline is all political jargon.",
    how: "Roya YouTube. One sketch, not the episode block.",
  },
  {
    id: "ktir",
    name: "كتير سلبي شو",
    job: "stretch",
    city: "Lebanese",
    use: "Taxi, generator, office. Daily absurdity.",
    skip: "News-parody stretches that swing into MSA.",
    how: "Clip one bit. Tag Lebanese.",
  },
  {
    id: "marhaba",
    name: "مرحبا دولة",
    job: "stretch",
    city: "Lebanese",
    use: "Citizen vs state. Bureaucratic talk you will hear.",
    skip: "As a first source before Shwayy.",
    how: "Sitcom scene, 90 s, then harvest lines.",
  },
  {
    id: "cooking",
    name: "Home cooking vlogs",
    job: "stretch",
    city: "Search by city",
    use: "Repeat verbs: حط, قلي, خلّص. Picture carries unknown words.",
    skip: "English food-tour hosts. Locals get eight seconds.",
    how: "Search طبخ سوري يوميات or طبخ لبناني بالبيت. One recipe step = one text.",
  },
  {
    id: "hikmat",
    name: "Hikmat Wehbi",
    job: "ear",
    city: "Lebanese",
    use: "Ear training. Fast overlap. Life stories.",
    skip: "Importing a 70-minute episode.",
    how: "Play in the background. Clip 90 s only if one anecdote is clear.",
  },
  {
    id: "sarde",
    name: "Sarde After Dinner",
    job: "ear",
    city: "Lebanese",
    use: "Casual talk. Topic lists help you jump.",
    skip: "Whole-episode study.",
    how: "Use the topic list as a chapter mark. Clip one topic or leave it as ear.",
  },
  {
    id: "sowt",
    name: "Sowt",
    job: "ear",
    city: "Amman / often MSA",
    use: "Only when a stretch is clearly dialect.",
    skip: "Journalistic MSA in this Levantine corpus.",
    how: "Lock dialect before any import. Tag MSA leaks.",
  },
  {
    id: "bab",
    name: "باب الحارة",
    job: "skip",
    city: "Old Damascene",
    use: "Later ear. Period honor-code talk.",
    skip: "As the default daily register.",
    how: "Watch if you enjoy it. Do not mine it for shop talk.",
  },
  {
    id: "kasr",
    name: "كسر عضم",
    job: "skip",
    city: "Syrian",
    use: "One family or phone scene a week, if you already watch it.",
    skip: "Crime and police jargon as the weekly text.",
    how: "Clip a daily-life stretch. Leave the plot as entertainment.",
  },
  {
    id: "news",
    name: "News",
    job: "skip",
    city: "MSA",
    use: "MSA study, elsewhere.",
    skip: "This corpus.",
    how: "Do not import.",
  },
];

export function sourcesForJob(job: SourceJob): SourceEntry[] {
  return SOURCE_ENTRIES.filter((entry) => entry.job === job);
}

export function sourceIdsAreUnique(entries: SourceEntry[] = SOURCE_ENTRIES): boolean {
  return new Set(entries.map((entry) => entry.id)).size === entries.length;
}
