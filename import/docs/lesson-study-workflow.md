# Lesson study workflow

Transcription is solved in this repo (`transcribe:benchmark` → `transcribe:lesson` → `transcribe:align` → `import:lesson`). This doc covers **what to do with the material** so study between lessons has a clear loop.

## Core idea

Do not ask: *“What should I do to learn Arabic this week?”*

Ask: *“What did this lesson give me that I still cannot produce cold?”*

Each lesson is **source data**. The corpus text + audio is the anchor. Everything else is extraction and practice.

```
LESSON (live)
    ↓
RECORDING + TRANSCRIPT (pipeline)
    ↓
CORPUS TEXT + AUDIO + LINE MARKERS
    ↓
STUDY PACK (auto) + YOUR REVIEW (manual)
    ↓
RECALL / LISTENING / OUTPUT (weekly rhythm)
    ↓
NEXT LESSON
```

## Three transcript layers (keep separate)

| Layer | File | Use |
| --- | --- | --- |
| **Verbatim** | `lesson_verbatim.json` | Source of truth for words; do not edit away dialect |
| **Dialogue** | `lesson_dialogue.md` | Speakers + timestamps; study navigation |
| **Corpus text** | imported `/texts/[id]` | Merged role blocks + synced audio jumps |

Do not merge these into one “cleaned” document. Cleaning belongs in **examples** and **vocabulary**, not in erasing the lesson recording.

## After each lesson (~30 min total, spread across the week)

### 1. Same day — skim only (10 min)

Open `lesson_study_pack.md` for that lesson.

- Read **grammar threads** and **confusion moments**
- Do **not** add 30 Anki cards
- In corpus text reader: play 2–3 timestamps you care about

Goal: know what the lesson actually trained, not memorize everything.

### 2. Active recall (15 min, ~2 days after lesson)

From the study pack **recall phrases**:

1. Read the English cue / context
2. Say the Arabic aloud without looking
3. Tap the line in corpus → hear the tutor’s version
4. If wrong: repeat 3×, then add **one** example to corpus (optional)

This is the highest-value between-lesson work for Levantine. Vocabulary you “know” in Anki but cannot say in conversation is exactly what lessons surface.

### 3. Listening (15–20 min, mid-week)

Replay **3 confusion moments** or **grammar threads** in the corpus reader.

Task: *How much can I follow without reading the text?*

Then read the line once. Hide translation. Listen again.

Your tutor already suggested dedicated listening practice every 2–3 lessons — use imported timestamps for that.

### 4. Output (15 min, before next lesson)

Record **3 minutes** in Arabic: what you did this week, or retell one story from the lesson (bike trip, health text, etc.).

No script. Messy is fine.

Optional later: run your recording through the same STT pipeline to spot recurring mistakes.

### 5. Anki / corpus examples (5–10 min × 2–3 sessions)

**Cap: 5–10 new cards per lesson.**

Good card sources:

- Phrases you failed in recall
- Tutor corrections (`not X — say Y`)
- Items from **confusion moments** (`what means…?`)

Bad card sources:

- Every new word the tutor said
- Full English explanations
- MSA-normalized forms that differ from what your tutor actually uses

Prefer promoting stable items into corpus **examples** linked to the lesson text line.

## What to extract from a Levantine lesson

Prioritize in this order:

1. **Production gaps** — you understood but could not say it
2. **Corrections** — tutor reformulated your sentence
3. **Contrast pairs** — `اليوم الجاي` vs `اليوم اللي بعده`, `كل يوم` vs `كل اليوم`
4. **Verb patterns** — `خفّف` / `كبّر`, `بفضّل`, `مشيت` vs `عملت`
5. **Natural chunks** — `خطوات صغيرة بتعمل فرق كبير`, `مع الوقت لاحظت…`

Deprioritize:

- Long English meta-talk about grammar in English
- One-off proper nouns unless they recur

## Uncertainty rule

If STT and Fathom disagree, or Arabic looks wrong: **trust audio, not text.**

Mark mentally as `[verify]` until you re-listen. A confident wrong transcript is worse than a gap.

In corpus, lines with `source: fathom_fallback` in `lesson_review_queue.csv` deserve a quick listen first.

## Weekly minimum rhythm

| When | Time | What |
| --- | --- | --- |
| Lesson day | 60 min | Live lesson + pipeline runs |
| +1 day | 10 min | Skim study pack |
| +2 days | 15 min | Active recall |
| +4 days | 20 min | Listening at timestamps |
| +6 days | 15 min | Speaking output |
| Ongoing | 5–10 min | Anki / corpus examples |

**~1–1.5 h/week** outside the lesson. Enough to compound; small enough to survive vacation weeks.

## Using the corpus app

Open a lesson text. You land on the **Study** tab by default.

| Tab / feature | Lesson use |
| --- | --- |
| **Study** | Recall cards, corrections, contrasts, confusion moments, grammar threads |
| **Dialogue** | Full transcript with Tutor/You labels; Arabic and English in separate blocks |
| **Audio** | Shared player above tabs; Play on cards; timestamp links jump to Dialogue |
| **Line markers** | Pre-set from import; refine manually if a boundary feels off |
| **Examples** | Save corrected sentences from the lesson |
| **Vocabulary** | Add only words you failed to produce |
| **Patterns** | Later — when you notice repeated moves (`كبّر`, ordinals, etc.) |

Study pack v2 stores structured cards in `texts.study_pack` (recall cards with English cue + Arabic target, corrections, contrasts).

## Commands (this lesson)

```bash
# Example lesson id:
npm run import:lesson -- --lesson lesson-2026-08-31 --owner-email you@example.com

# Re-generate study pack (v2 JSON) on an existing import:
npm run import:lesson -- --lesson lesson-2026-08-31 --update-study-pack
```

## What comes next (not built yet)

- LLM pass for glosses + error tagging (read-only, no auto-commit to DB)
- Anki export from study pack
- Recurring mistake detection across lessons

For now: **corpus text + study pack + weekly rhythm** is the system.
