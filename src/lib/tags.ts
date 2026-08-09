import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

type TagLink =
  | { kind: "text"; entityId: string }
  | { kind: "example"; entityId: string }
  | { kind: "vocabulary"; entityId: string }
  | { kind: "structure"; entityId: string };

export async function syncTags(
  supabase: Client,
  ownerId: string,
  link: TagLink,
  names: string[],
): Promise<{ error?: string }> {
  const tagIds: string[] = [];
  for (const name of names) {
    const { data: existing, error: findError } = await supabase
      .from("tags")
      .select("id, name")
      .eq("owner_id", ownerId)
      .ilike("name", name)
      .maybeSingle();

    if (findError) {
      return { error: findError.message };
    }

    if (existing) {
      tagIds.push(existing.id);
      continue;
    }

    const { data: created, error: createError } = await supabase
      .from("tags")
      .insert({ owner_id: ownerId, name })
      .select("id")
      .single();

    if (createError || !created) {
      return { error: createError?.message ?? "Could not create tag." };
    }
    tagIds.push(created.id);
  }

  if (link.kind === "text") {
    const { error: deleteError } = await supabase
      .from("text_tags")
      .delete()
      .eq("text_id", link.entityId);
    if (deleteError) return { error: deleteError.message };
    if (tagIds.length === 0) return {};
    const { error } = await supabase.from("text_tags").insert(
      tagIds.map((tag_id) => ({ text_id: link.entityId, tag_id })),
    );
    return error ? { error: error.message } : {};
  }

  if (link.kind === "example") {
    const { error: deleteError } = await supabase
      .from("example_tags")
      .delete()
      .eq("example_id", link.entityId);
    if (deleteError) return { error: deleteError.message };
    if (tagIds.length === 0) return {};
    const { error } = await supabase.from("example_tags").insert(
      tagIds.map((tag_id) => ({ example_id: link.entityId, tag_id })),
    );
    return error ? { error: error.message } : {};
  }

  if (link.kind === "vocabulary") {
    const { error: deleteError } = await supabase
      .from("vocabulary_tags")
      .delete()
      .eq("vocabulary_id", link.entityId);
    if (deleteError) return { error: deleteError.message };
    if (tagIds.length === 0) return {};
    const { error } = await supabase.from("vocabulary_tags").insert(
      tagIds.map((tag_id) => ({ vocabulary_id: link.entityId, tag_id })),
    );
    return error ? { error: error.message } : {};
  }

  const { error: deleteError } = await supabase
    .from("structure_tags")
    .delete()
    .eq("structure_id", link.entityId);
  if (deleteError) return { error: deleteError.message };
  if (tagIds.length === 0) return {};
  const { error } = await supabase.from("structure_tags").insert(
    tagIds.map((tag_id) => ({ structure_id: link.entityId, tag_id })),
  );
  return error ? { error: error.message } : {};
}

export function tagsToInput(
  tags: ({ name: string } | null | undefined)[] | null | undefined,
): string {
  if (!tags || tags.length === 0) return "";
  return tags
    .map((tag) => tag?.name)
    .filter((name): name is string => Boolean(name))
    .join(", ");
}

export function notNull<T>(value: T | null | undefined): value is T {
  return value != null;
}
