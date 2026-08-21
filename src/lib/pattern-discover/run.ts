import { createClient } from "@supabase/supabase-js";

import {
  discoverMiddleDoublingDrafts,
  type DiscoverVocab,
  type SuggestionDraft,
} from "@/lib/pattern-discover/middle-doubling";
import { firstGloss } from "@/lib/arabic-links";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/env";
import type { Database, Json } from "@/types/database";

export type DiscoverRunResult = {
  ownerId: string;
  scanned: number;
  drafts: number;
  inserted: number;
  updated: number;
  skippedLinked: number;
  skippedExisting: number;
  samples: {
    fingerprint: string;
    confidence: string;
    pairs: string[];
    reasoning: string;
  }[];
};

function createAdminClient() {
  return createClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function resolveOwnerId(opts: {
  ownerId?: string;
  ownerEmail?: string;
}): Promise<string> {
  if (opts.ownerId?.trim()) return opts.ownerId.trim();
  const email = opts.ownerEmail?.trim().toLowerCase();
  if (!email) {
    throw new Error("Pass --owner-id or --owner-email");
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) throw new Error(error.message);
  const user = data.users.find(
    (row) => row.email?.trim().toLowerCase() === email,
  );
  if (!user) {
    throw new Error(`No auth user for email ${email}`);
  }
  return user.id;
}

function pairAlreadyLinked(
  linked: Set<string>,
  baseId: string,
  derivedId: string,
): boolean {
  // Same pattern if both members already sit on any shared pattern — skip for v1
  // if either side already has pattern links covering both via fingerprint skip below.
  void linked;
  void baseId;
  void derivedId;
  return false;
}

export async function runPatternDiscover(opts: {
  ownerId?: string;
  ownerEmail?: string;
  dryRun?: boolean;
}): Promise<DiscoverRunResult> {
  const ownerId = await resolveOwnerId(opts);
  const supabase = createAdminClient();

  const { data: vocabRows, error: vocabError } = await supabase
    .from("vocabulary")
    .select("id, arabic, root, vocabulary_senses(gloss, created_at)")
    .eq("owner_id", ownerId);
  if (vocabError) throw new Error(vocabError.message);

  const vocab: DiscoverVocab[] = (vocabRows ?? []).map((row) => ({
    id: row.id,
    arabic: row.arabic,
    root: row.root,
    gloss: firstGloss(row.vocabulary_senses) ?? null,
  }));

  const { data: ownerPatterns } = await supabase
    .from("morph_patterns")
    .select("id")
    .eq("owner_id", ownerId);
  const patternIds = (ownerPatterns ?? []).map((row) => row.id);

  const patternMembers = new Map<string, Set<string>>();
  if (patternIds.length > 0) {
    const { data: linkedRows } = await supabase
      .from("pattern_vocabulary")
      .select("pattern_id, vocabulary_id")
      .in("pattern_id", patternIds);
    for (const row of linkedRows ?? []) {
      const set = patternMembers.get(row.pattern_id) ?? new Set();
      set.add(row.vocabulary_id);
      patternMembers.set(row.pattern_id, set);
    }
  }

  const { data: existingSuggestions } = await supabase
    .from("pattern_suggestions")
    .select("fingerprint, status")
    .eq("owner_id", ownerId);

  const existingFingerprints = new Set(
    (existingSuggestions ?? []).map((row) => row.fingerprint),
  );

  const drafts = discoverMiddleDoublingDrafts(vocab);
  let skippedLinked = 0;
  let skippedExisting = 0;
  let inserted = 0;
  let updated = 0;
  const toWrite: SuggestionDraft[] = [];

  for (const draft of drafts) {
    if (existingFingerprints.has(draft.fingerprint)) {
      skippedExisting += 1;
      continue;
    }
    const members = new Set(draft.payload.member_ids);
    const alreadyPattern = [...patternMembers.values()].some((set) => {
      let hit = 0;
      for (const id of members) {
        if (set.has(id)) hit += 1;
      }
      return hit >= 2 && hit === members.size;
    });
    if (alreadyPattern) {
      skippedLinked += 1;
      continue;
    }
    // Also skip if every pair is already co-linked on some pattern
    const pairsCovered = draft.payload.pairs.every((pair) =>
      [...patternMembers.values()].some(
        (set) => set.has(pair.base_id) && set.has(pair.derived_id),
      ),
    );
    if (pairsCovered && draft.payload.pairs.length > 0) {
      skippedLinked += 1;
      continue;
    }
    void pairAlreadyLinked;
    toWrite.push(draft);
  }

  if (!opts.dryRun) {
    for (const draft of toWrite) {
      const row = {
        owner_id: ownerId,
        status: "pending",
        detector_id: draft.detector_id,
        detector_version: draft.detector_version,
        name: draft.name,
        arabic_sketch: draft.arabic_sketch,
        form_label: draft.form_label,
        cue: draft.cue,
        meaning_shift: draft.meaning_shift,
        confidence: draft.confidence,
        signals: draft.signals as unknown as Json,
        reasoning: draft.reasoning,
        fingerprint: draft.fingerprint,
        source: draft.source,
        payload: draft.payload as unknown as Json,
      };
      const { error } = await supabase.from("pattern_suggestions").upsert(row, {
        onConflict: "owner_id,fingerprint",
      });
      if (error) throw new Error(error.message);
      inserted += 1;
    }
  }

  const samples = toWrite.slice(0, 12).map((draft) => {
    const glossById = new Map(vocab.map((v) => [v.id, v]));
    const pairs =
      draft.payload.pairs.length > 0
        ? draft.payload.pairs.map((pair) => {
            const base = glossById.get(pair.base_id);
            const derived = glossById.get(pair.derived_id);
            return `${base?.arabic ?? "?"} → ${derived?.arabic ?? "?"}`;
          })
        : draft.payload.member_ids.slice(0, 8).map((id) => {
            const row = glossById.get(id);
            return row?.arabic ?? "?";
          });
    return {
      fingerprint: draft.fingerprint.slice(0, 10),
      confidence: draft.confidence,
      pairs,
      reasoning: draft.reasoning,
    };
  });

  return {
    ownerId,
    scanned: vocab.length,
    drafts: drafts.length,
    inserted: opts.dryRun ? 0 : inserted,
    updated,
    skippedLinked,
    skippedExisting,
    samples,
  };
}
