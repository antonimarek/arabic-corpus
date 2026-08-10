# Import workspace (local pipeline)

Private source files live in `/raw` (gitignored).

This directory holds:

- `configs/` — column mapping examples (tracked)
- `fixtures/` — synthetic staging JSON (tracked)
- `scripts/` — CLI entrypoints (tracked)
- `normalized/`, `staging/`, `reports/`, `processed/` — generated output (gitignored)

## Local review UI

`/admin/imports` reads filesystem staging. It is a **local/dev tool**, not a production feature. Deployed Vercel has no local staging files.

## Run

```bash
npm run import -- --file raw/your.csv --config import/configs/csv-example.example.json --type csv
```

## Future LLM extraction

Not implemented. Target parse shape: `ExtractedImport` / `StagingCandidate` in `src/lib/import/schema.ts`.
