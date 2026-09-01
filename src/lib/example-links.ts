export function exampleNewHref(
  textId: string,
  arabic: string,
  options?: { translation?: string; sourceLine?: number },
): string {
  const params = new URLSearchParams({
    text: textId,
    arabic,
  });
  if (options?.translation?.trim()) {
    params.set("translation", options.translation.trim());
  }
  if (options?.sourceLine != null) {
    params.set("line", String(options.sourceLine));
  }
  return `/examples/new?${params.toString()}`;
}
