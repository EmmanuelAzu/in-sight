# In-sight

**Every verse, in sight of what came before.** A King James Bible where each verse opens onto the scripture behind it: who is speaking and to whom, what was happening on the ground, earlier verses it draws on, where it is taken up later, the Greek and Hebrew underneath, and tools to study across the whole Bible.

## What's in it

| View | What it does |
|---|---|
| **Read** (`/read/[book]/[chapter]`) | Full KJV with red letters and the translators' italics. Every verse is tagged by speaker or kind (God, Jesus, apostle, disciple, OT/NT reference, prophecy, prayer). Tap a verse to open the insight panel. |
| **Insight panel** | Context card (scripture-only, every line cited), curated roots, cross-references split into earlier/later scripture with link strength, then-and-now comparisons, original-language words with lexicon entries, your highlights and notes. "How we know this" shows the evidence behind every line and tag. |
| **Threads** (`/threads`) | Curated themes and automatic traces drawn across a Genesis→Revelation strip, in canonical order. |
| **Then & now** (`/compare`) | Word-by-word comparison of New Testament quotations against their Old Testament source (7 curated, 100+ detected). |
| **Study by speaker** (`/study`) | Filter the whole Bible by voice or kind of text, with counts by book. |
| **Words** (`/words`) | Any Greek or Hebrew lemma: definition, where it is used by book, every verse, and same-English contrasts (logos/rhēma, agapē/phileō). |
| **Ask the text** (`/ask`) | Answers built only from retrieved KJV verses; every sentence must cite a verse, and a second model pass checks each citation. |
| **My study** (`/mine`) | Highlights, notes and study paths; share paths with others when signed in. |

## Two layers, kept apart

1. **Scripture-only context** (`content/contexts.json`, `content/insights.json`): human-written lines, each citing KJV verses and marked *stated* or *interpretation*. Where the Bible doesn't say (e.g. Matthew's writer), the card says so.
2. **Generated and lexical data** (`public/data`): speaker tags, cross-reference strengths, quotations and the Greek/Hebrew. Every generated tag records the rule that produced it, shown to readers under "How we know this".

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
```

Everything except Ask and accounts works with no configuration. Optional environment variables are in `.env.example`:

- `ANTHROPIC_API_KEY` turns on **Ask the text**.
- `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` turn on **GitHub sign-in** (create an OAuth app with callback `https://<your-domain>/api/auth/callback/github`).
- `DATABASE_URL` (Postgres; Neon via the Vercel Marketplace sets it) stores study data and shared paths. Tables are created on first use; see `db/schema.sql`.

Without sign-in, study data is kept in the browser.

## Rebuild the data

The generated files are committed. To rebuild them from the sources:

```bash
git clone --depth 1 https://github.com/seven1m/open-bibles ../src/open-bibles
git clone --depth 1 https://github.com/scrollmapper/bible_databases ../src/bible_databases
git clone --depth 1 https://github.com/STEPBible/STEPBible-Data ../src/STEPBible-Data
python3 -I scripts/build_data.py --kjv ../src/open-bibles/eng-kjv.osis.xml \
  --xref ../src/bible_databases/formats/sql/extras --step ../src/STEPBible-Data --out .
```

## Adding context cards

Context is written per chapter in `content/contexts.json` (keyed `Book.chapter`, e.g. `Gal.5`) and per verse in `content/insights.json`. Each line is `[text, [verse ids], "s" | "i"]`. Cite only verses; mark anything inferred as `"i"`. Book ids follow OSIS (`Gen`, `Ps`, `Matt`, `1Cor`, …).

See `DATA_SOURCES.md` for licences and attribution.
