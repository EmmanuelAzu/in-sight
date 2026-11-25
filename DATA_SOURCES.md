# Data sources and licences

| Data | Source | Licence |
|---|---|---|
| King James Version text, words of Jesus, italics, psalm titles | CrossWire KJV OSIS module, via [seven1m/open-bibles](https://github.com/seven1m/open-bibles) | Public domain (outside the UK; Crown patent applies in the UK) |
| Cross-references and reader votes | [OpenBible.info](https://www.openbible.info/labs/cross-references/), via [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) | CC BY |
| Greek NT and Hebrew OT word tagging (TAGNT, TAHOT) and brief lexicons (TBESG, TBESH) | [STEPBible.org](https://github.com/STEPBible/STEPBible-Data), Tyndale House Cambridge | CC BY 4.0 |
| Context cards, curated roots, threads, comparisons, word notes (`content/`) | Written for In-sight | Project licence |

## How generated data is produced (`scripts/build_data.py`)

- **Jesus speaking:** the verse contains words-of-Jesus markup in the KJV source.
- **God speaking:** an Old Testament verse contains a divine-speech formula ("saith the LORD", "God said", "I am the LORD", …).
- **Apostle speaking:** the verse is in a letter whose opening names Paul or Peter (the apostle claim is cited, e.g. Rom 1:1).
- **Disciple speaking:** narration in John's Gospel (John 21:20, 24).
- **Prophecy:** a book of prophecy (Isaiah–Malachi, Revelation), or a New Testament fulfilment formula.
- **Prayer:** the verse addresses God directly ("O LORD", "Our Father which art…").
- **OT / NT reference:** the verse quotes or closely echoes the other Testament, or shares a rarer key word with a verse readers strongly link to it (40+ votes).
- **Link strength:** compares content words of the two verses (stop-words removed). *Quotation*: a long shared word sequence; *close echo*: a moderate one; *shared word*: a rarer word in common; *reader-linked*: no shared wording. *Shared image* is only used in curated links.

These are heuristics. Each tag and strength is labelled as generated and shows its rule in the app.
