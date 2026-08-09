export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-medium text-[var(--ink)]">Setup required</h1>
      <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">
        Copy <code className="text-[var(--ink)]">.env.example</code> to{" "}
        <code className="text-[var(--ink)]">.env.local</code>, set your Supabase
        URL and key, set <code className="text-[var(--ink)]">ALLOWED_EMAILS</code>
        , then restart the dev server. Apply{" "}
        <code className="text-[var(--ink)]">supabase/migrations</code> to your
        project.
      </p>
    </main>
  );
}
