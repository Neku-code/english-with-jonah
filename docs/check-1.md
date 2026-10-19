# First check — rankings, vocabulary and rewards

Owner's requirements dated 19 October 2026. The second problem/fix check and
third visual design check are separate work.

## Implemented

- [x] Student-only `/ranking`, ordered by saved coins, shared ranks for ties,
  current-student highlight, active students only and a recoverable error state.
- [x] **Ko‘rib chiqdim** records vocabulary review and opens its lesson.
- [x] **Test topshirish** retains the sampled typed test and >=75% threshold;
  passing masters vocabulary and awards **30 coins once**.
- [x] Completing each teaching lesson awards **50 coins once**.
- [x] Passing final exam 1.6 at >=90%, after finishing lessons 1.1–1.5,
  grants mastery and **10 coins per teaching lesson** (50 bonus coins total).
- [x] Exactly-once rewards across retries, concurrent requests, refreshes,
  teacher reviews and new content revisions. Practice questions give no coins.
- [x] Return to vocabulary testing from home and an open lesson's dictionary.
- [x] Actual balances/statuses on home, lesson navigation/results and teacher
  student details. Exercise marks and reward coins stay separately labeled.
- [x] Migration 0009, typed schema, immutable receipts and historical backfill.
- [x] Updated project requirements and meaningful regression coverage.

Unit 1 maximum: 5 × (30 vocabulary + 50 lesson + 10 mastery) = **450 coins**.
The sixth entry is the final exam, not another 50-coin teaching lesson.
Review gives zero coins; failing later does not erase already earned receipts.
Teacher corrections change effective progress/mastery, while retained receipts
prevent re-earning the same reward.

## Verification

- `pnpm check`: zero errors and warnings.
- `pnpm build`: successful complete Vercel adapter build on Linux.
- 27 service/grading/Unit 1 checks, 5 student HTTP checks and 4 teacher HTTP
  checks passed against disposable PostgreSQL WASM instances (PGlite). This
  includes full Unit 1 completion reaching 450 coins, transaction rollback,
  duplicate requests, cross-student/revision isolation and teacher amendments.
- A separate pre-0009 migration check backfilled real-shaped historical passes,
  completion and mastery exactly once; it retained attempt history and repeated
  migration did not add coins.
- The repository's normal `pnpm test` uses native embedded PostgreSQL. This
  workspace runs as root without OS user-switching capability, so that native
  test server cannot initialize here. A temporary ignored local harness was used
  for the checks above and restored afterward. No PGlite dependency or harness
  change is committed. Native PostgreSQL concurrency still needs GitHub CI.
- Headless Chromium checks at 390×844 and 1440×1000 passed: review unlock,
  typed vocabulary test, reload with persistent 30 coins, ranking current row,
  no horizontal overflow and no browser exceptions. Screenshots were visually
  inspected. Browser checks used isolated fixtures, not production.
- No production database, student profile or learning record was modified.

## Rollout

This feature requires migration **0009_learning_rewards.sql before deployment**.
Run `pnpm db:migrate` against the intended Neon database, then deploy this code.
Do not run synthetic tests against production. No curriculum re-publication is
needed; all existing lesson IDs, revisions, assets and attempts remain intact.

Neon/Vercel credentials and their connected plugins were unavailable in this
Work session. The feature is therefore committed on a dedicated GitHub branch
and submitted as a draft PR, without changing production `main`. Merge/deploy
after migration and native CI verification. This is a rollout dependency, not
an additional student sign-in or teacher permission requirement.
