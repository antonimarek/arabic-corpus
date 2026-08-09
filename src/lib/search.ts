import type { SupabaseClient } from "@supabase/supabase-js";

import { embedQueryText, isEmbeddingConfigured } from "@/lib/embeddings";
import type { Database } from "@/types/database";

export type SearchHitType = "text" | "example" | "vocabulary" | "structure";
export type MatchLayer = "exact" | "fuzzy" | "semantic";

export type SearchHit = {
  type: SearchHitType;
  id: string;
  title: string;
  subtitle?: string;
  arabic?: string;
  score: number;
  matchLabel?: string;
  matchLayer?: MatchLayer;
  context?: string[];
};

export type SearchResult = {
  hits: SearchHit[];
  layersTried: MatchLayer[];
  missLogged: boolean;
  semanticAttempted: boolean;
};

type RpcRow = {
  entity_type: string;
  entity_id: string;
  title: string;
  arabic: string | null;
  subtitle: string | null;
  score: number;
  match_label: string | null;
  match_layer: string | null;
  context: string[] | null;
};

function toHit(row: RpcRow): SearchHit | null {
  if (
    row.entity_type !== "text" &&
    row.entity_type !== "example" &&
    row.entity_type !== "vocabulary" &&
    row.entity_type !== "structure"
  ) {
    return null;
  }

  const layer =
    row.match_layer === "fuzzy" ||
    row.match_layer === "semantic" ||
    row.match_layer === "exact"
      ? row.match_layer
      : "exact";

  return {
    type: row.entity_type,
    id: row.entity_id,
    title: row.title,
    arabic: row.arabic ?? undefined,
    subtitle: row.subtitle ?? undefined,
    score: Number(row.score) || 0,
    matchLabel: row.match_label ?? undefined,
    matchLayer: layer,
    context: row.context?.filter(Boolean) ?? [],
  };
}

function mergeHits(primary: SearchHit[], secondary: SearchHit[]): SearchHit[] {
  const map = new Map<string, SearchHit>();
  for (const hit of [...primary, ...secondary]) {
    const key = `${hit.type}:${hit.id}`;
    const existing = map.get(key);
    if (!existing || hit.score > existing.score) {
      map.set(key, hit);
    } else if (
      existing &&
      hit.matchLayer === "exact" &&
      existing.matchLayer !== "exact"
    ) {
      map.set(key, { ...existing, matchLayer: "exact", matchLabel: hit.matchLabel });
    }
  }
  return [...map.values()].sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title),
  );
}

export async function searchCorpus(
  supabase: SupabaseClient<Database>,
  rawQuery: string,
): Promise<SearchResult> {
  const query = rawQuery.trim();
  if (!query) {
    return {
      hits: [],
      layersTried: [],
      missLogged: false,
      semanticAttempted: false,
    };
  }

  const layersTried: MatchLayer[] = ["exact", "fuzzy"];

  const { data, error } = await supabase.rpc("search_corpus", {
    search_query: query,
    result_limit: 40,
    fuzzy_threshold: 0.22,
  });

  if (error) {
    throw new Error(error.message);
  }

  let hits = ((data as RpcRow[] | null) ?? [])
    .map(toHit)
    .filter((hit): hit is SearchHit => Boolean(hit));

  let semanticAttempted = false;

  if (isEmbeddingConfigured()) {
    semanticAttempted = true;
    layersTried.push("semantic");
    try {
      const embedding = await embedQueryText(query);
      if (embedding) {
        const { data: semanticData, error: semanticError } = await supabase.rpc(
          "search_corpus_semantic",
          {
            query_embedding: JSON.stringify(embedding),
            result_limit: 20,
            match_threshold: 0.72,
          },
        );
        if (!semanticError && semanticData) {
          const semanticHits = ((semanticData as RpcRow[]) ?? [])
            .map(toHit)
            .filter((hit): hit is SearchHit => Boolean(hit))
            .map((hit) => ({
              ...hit,
              // Keep semantic below strong exact/fuzzy unless very confident
              score: hit.score * 70,
              matchLayer: "semantic" as const,
            }));
          hits = mergeHits(hits, semanticHits);
        }
      }
    } catch {
      // Semantic is optional. Exact/fuzzy still work.
    }
  }

  let missLogged = false;
  if (hits.length === 0) {
    const { error: missError } = await supabase.rpc("log_search_miss", {
      miss_query: query,
      layers: layersTried,
    });
    missLogged = !missError;
  }

  return { hits, layersTried, missLogged, semanticAttempted };
}

export function hrefForHit(hit: SearchHit): string {
  switch (hit.type) {
    case "text":
      return `/texts/${hit.id}`;
    case "example":
      return `/examples/${hit.id}`;
    case "vocabulary":
      return `/vocabulary/${hit.id}`;
    case "structure":
      return `/structures/${hit.id}`;
  }
}
