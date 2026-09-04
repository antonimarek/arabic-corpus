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

## Lesson transcription benchmark

Private lesson audio stays outside git (`raw/` or any absolute path). Benchmark OpenRouter STT models on a clip:

```bash
npm run transcribe:benchmark -- \
  --audio "/path/to/lesson.m4a" \
  --lesson lesson-2026-08-31
```

Outputs land in `import/processed/lessons/<lesson>/benchmark/`:

- `summary.md` — side-by-side transcript comparison
- `<model>.txt` / `<model>.json` — per-model text + usage/cost
- `manifest.json` — run metadata

Requires `OPENROUTER_API_KEY` in `.env.local`. Default clip is 5 minutes starting at 15:00 (configurable via `--start` / `--duration` or `import/configs/transcribe-benchmark.example.json`). Long clips are split into ~2 minute chunks to avoid provider timeouts.

### Fathom MCP (speakers + timestamps)

Fathom MCP is read-only. It does **not** download audio, but `get_meeting_transcript` returns:

- speaker labels (`Student`, `Speaker 2`, …)
- `[MM:SS]` timestamps
- deep links to each utterance

Save the MCP transcript locally, then pass it to the benchmark:

```bash
npm run transcribe:benchmark -- \
  --audio "/path/to/lesson.m4a" \
  --lesson lesson-2026-08-31 \
  --fathom-transcript import/processed/lessons/lesson-2026-08-31/fathom.transcript.raw.txt \
  --fathom-recording-id YOUR_RECORDING_ID
```

This writes `fathom.clip.json` / `fathom.clip.md` for the benchmark window. Use Fathom for **turn structure**, OpenRouter STT for **words**. The Downloads `.txt` export is a flat dump without speakers — prefer MCP transcript.

### Align STT to Fathom turns

After `transcribe:lesson`, map speaker-labelled Fathom timestamps onto the STT text:

```bash
npm run transcribe:align -- --lesson lesson-2026-08-31
```

Optional Wispr Flow transcript (`Name: text` lines, no timestamps required). Put it at `import/processed/lessons/<id>/wispr.transcript.raw.txt` or pass `--wispr-transcript`:

```bash
npm run transcribe:align -- --lesson sep-03-2026 \
  --wispr-transcript import/processed/lessons/sep-03-2026/wispr.transcript.raw.txt
```

Roles/timestamps stay on Fathom (`Antoni` student, `Speaker 2` / Moayad tutor). Wispr only supplies wording when the sequence match is good. Words prefer Wispr → STT → Fathom.

Writes:

- `lesson_dialogue.md` — `TUTOR` / `STUDENT` turns with chosen wording
- `lesson_dialogue.json` — structured turns + stats (`wispr` / `stt` / `mixed` / `fathom_fallback`)
- `lesson_review_queue.csv` — side-by-side sources for review

### Import to corpus + study pack

```bash
npm run import:lesson -- --lesson lesson-2026-08-31 --owner-email you@example.com
```

Creates a **text** with merged dialogue lines, synced audio (compressed if needed), line-start markers, and an in-app **Study** tab (structured `study_pack` v2 JSON on the text). Also stores `fathomArabic` / `wisprArabic` for a Dialogue tab toggle (**Speakers** vs **Aligned (STT)**). Writes `lesson_study_pack.md` locally.

To refresh study pack on an already-imported lesson (regenerates v2 recall cards, corrections, contrasts):

```bash
npm run import:lesson -- --lesson lesson-2026-08-31 --update-study-pack
```

To rewrite dialogue arabic + line markers + study pack after a better align:

```bash
npm run import:lesson -- --lesson lesson-2026-08-31 --update-dialogue
```

Study workflow: `import/docs/lesson-study-workflow.md`.

## Future LLM extraction

Not implemented. Target parse shape: `ExtractedImport` / `StagingCandidate` in `src/lib/import/schema.ts`.
