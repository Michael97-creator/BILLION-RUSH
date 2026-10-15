# Startup Branding and Balanced Question Pool Update — 14 October 2026

## Startup branding
- Added the user's supplied Jumi Tech logo at `billion-rush/public/jumi-tech-logo.png`.
- Added a bespoke Billion Rush crest at `billion-rush/public/billion-rush-logo.png`, designed for the existing midnight-navy, champagne-gold, cyan, and violet palette.
- Added a short, offline-ready cold-start sequence: Jumi Tech introduction, “A Jumi Tech Production”, Billion Rush logo reveal, then the existing screen.
- The sequence runs once per browser/app webview session, does not replay on ordinary in-app screen renders, and respects reduced-motion preferences. Animations are CSS-only; no video or remote asset is required.

## Question pool
- Initial bundled pool: exactly 200 question records.
- Retained all original topic labels and introduced focused English subtopics: English Spelling, English Grammar, and English Vocabulary & Usage.
- Added 75 questions across the previously underrepresented topics, retaining the existing 50-question gameplay and difficulty ladder.
- Question selection now uses shuffled category buckets and round-robin selection within local, regional, and global pools. It tries to limit any one category to four questions per game and English as a family to eight questions, before relaxing caps only if required to fill a run.
- Difficulty remains hidden in the player-facing “RUSH 01” presentation.

## Static validation results
- Question records: 200.
- Categories: 22.
- Topic counts:
  - Africa: 8
  - Astronomy: 8
  - Billion Rush: 8
  - English Grammar: 14
  - English Spelling: 20
  - English Vocabulary & Usage: 6
  - General Knowledge: 8
  - Geography: 8
  - Ghana: 8
  - History: 8
  - India: 8
  - Kenya: 8
  - Literature: 8
  - Mathematics: 9
  - Music: 8
  - Nature: 8
  - Nigeria: 9
  - Science: 12
  - Sports: 8
  - Technology: 10
  - United Kingdom: 8
  - United States: 8.
- IDs: unique.
- Exact duplicate question prompts: none.
- Every question has four unique options, an integer answer index in range, and an explanation field.
- Topic counts are in the accompanying validation output / release notes.

Structural tests cannot mathematically prove every factual answer in a 200-question bank. The added facts and answer keys were reviewed during implementation, but a full editorial fact-check and live browser/Android gameplay test remain necessary before public release.
