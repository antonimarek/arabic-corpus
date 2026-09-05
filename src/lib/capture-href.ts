export function newStructureHref(opts: {
  arabic?: string;
  exampleId?: string;
  textId?: string;
  lineNumber?: number;
}): string {
  const params = new URLSearchParams();
  const arabic = opts.arabic?.trim();
  if (arabic) params.set("arabic", arabic);
  if (opts.exampleId) params.set("example", opts.exampleId);
  if (opts.textId) params.set("text", opts.textId);
  if (opts.textId && opts.lineNumber != null) {
    params.set("line", String(opts.lineNumber));
  }
  const query = params.toString();
  return query ? `/structures/new?${query}` : "/structures/new";
}
