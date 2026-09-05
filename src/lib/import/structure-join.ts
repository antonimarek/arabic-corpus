import type { ImportItem } from "./bundle";

export function collectStructureNameIds(
  items: ImportItem[],
  itemIds: (string | null)[],
): Map<string, string> {
  const map = new Map<string, string>();
  items.forEach((item, index) => {
    if (item.type !== "structure") return;
    const id = itemIds[index];
    const name = item.name?.trim();
    if (!id || !name) return;
    map.set(name, id);
  });
  return map;
}

export function structureIdsForExample(
  item: ImportItem,
  nameToId: Map<string, string>,
): string[] {
  const ids: string[] = [];
  for (const raw of item.structure_names ?? []) {
    const name = raw.trim();
    const id = name ? nameToId.get(name) : undefined;
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}
