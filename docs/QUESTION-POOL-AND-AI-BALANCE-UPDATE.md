# Billion Rush question-pool and AI balancing update

## Changes
- Kept the initial local question bank at exactly 200 unique questions.
- Expanded the static pool to 32 topics, including Film & Television, Riddles & Logic, Art & Architecture, Business & Economics, Food & Cuisine, Mythology, Philosophy, Psychology, Inventions & Discoveries, and Politics & Civics.
- Retained English Spelling, English Grammar, and English Vocabulary & Usage as separate categories, while replacing some older entries to make room for more topic breadth.
- Kept four answer choices, a single answer index, explanations, and difficulty values for each local question.
- Updated AI player-question generation to explicitly cover the expanded topic taxonomy, prefer category diversity within batches, and cap English-family generated questions to 20% of a batch.
- Updated stored generated-question retrieval to round-robin across categories rather than simply taking newest rows first.
- Kept the existing gameplay category-round-robin and hidden difficulty progression.

## Exact static topic distribution

| Topic | Count |
|---|---:|
| Africa | 8 |
| Art & Architecture | 4 |
| Astronomy | 8 |
| Billion Rush | 7 |
| Business & Economics | 4 |
| English Grammar | 12 |
| English Spelling | 14 |
| English Vocabulary & Usage | 4 |
| Film & Television | 4 |
| Food & Cuisine | 4 |
| General Knowledge | 6 |
| Geography | 6 |
| Ghana | 8 |
| History | 6 |
| India | 8 |
| Inventions & Discoveries | 4 |
| Kenya | 8 |
| Literature | 7 |
| Mathematics | 5 |
| Music | 7 |
| Mythology | 4 |
| Nature | 8 |
| Nigeria | 5 |
| Philosophy | 4 |
| Politics & Civics | 4 |
| Psychology | 4 |
| Riddles & Logic | 4 |
| Science | 5 |
| Sports | 7 |
| Technology | 5 |
| United Kingdom | 8 |
| United States | 8 |
| **Total** | **200** |

## Validation status
- 26 automated tests pass, including checks for exactly 200 records, unique IDs/prompts, four distinct answer options, valid answer indexes, topic coverage, AI prompt topic coverage, category-aware stored-pool retrieval, and English batch limits.
- Static project integrity verification passes.
- Production Vite build was attempted but could not run because the Vite dependency is not installed in this environment (`vite: not found`). Run `npm install` on the user's machine before building.
- The AI endpoint's runtime behaviour cannot be fully confirmed from static tests. It requires valid Supabase deployment, the configured Gemini API secret, and staging tests against the deployed Edge Function. AI review reduces risk but cannot guarantee factual accuracy; generated items should still be sampled and reviewed.
