export type SuggestionPayload = {
  pairs: { base_id: string; derived_id: string }[];
  member_ids: string[];
};

export function parseSuggestionPayload(raw: unknown): SuggestionPayload {
  if (!raw || typeof raw !== "object") {
    return { pairs: [], member_ids: [] };
  }
  const obj = raw as Record<string, unknown>;
  const pairsRaw = Array.isArray(obj.pairs) ? obj.pairs : [];
  const pairs = pairsRaw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const base_id = String((row as { base_id?: string }).base_id ?? "").trim();
      const derived_id = String(
        (row as { derived_id?: string }).derived_id ?? "",
      ).trim();
      if (!base_id || !derived_id) return null;
      return { base_id, derived_id };
    })
    .filter((row): row is { base_id: string; derived_id: string } =>
      Boolean(row),
    );
  const member_ids = Array.isArray(obj.member_ids)
    ? obj.member_ids.map((id) => String(id)).filter(Boolean)
    : [
        ...new Set(pairs.flatMap((pair) => [pair.base_id, pair.derived_id])),
      ];
  return { pairs, member_ids };
}

export function signalLabels(signals: unknown): string[] {
  if (!signals || typeof signals !== "object") return [];
  const s = signals as Record<string, unknown>;
  const labels: string[] = [];
  if (s.middle_doubled) labels.push("Middle consonant doubled");
  if (s.same_skeleton) labels.push("Same consonant skeleton");
  if (s.compatible_shapes) labels.push("Compatible surface shapes");
  if (s.same_root) labels.push("Same root field");
  if (typeof s.pair_count === "number") {
    labels.push(`${s.pair_count} example pair${s.pair_count === 1 ? "" : "s"}`);
  }
  return labels;
}
