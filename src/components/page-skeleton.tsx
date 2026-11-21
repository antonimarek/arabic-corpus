/** Instant placeholder shown by route `loading.tsx` files while a tab streams in. */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <section className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="flex items-center justify-between gap-4">
        <div className="h-7 w-36 rounded bg-[var(--line)] motion-safe:animate-pulse" />
        <div className="h-10 w-28 rounded-[var(--radius-md)] bg-[var(--line)] opacity-60 motion-safe:animate-pulse" />
      </div>
      <ul className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <li
            key={i}
            className="h-16 rounded-[var(--radius-md)] bg-[var(--line)] opacity-50 motion-safe:animate-pulse"
          />
        ))}
      </ul>
    </section>
  );
}
