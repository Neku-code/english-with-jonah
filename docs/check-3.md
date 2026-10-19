# Third check — illustrated student design and teacher night mode

The owner's selected desktop/mobile reference supersedes the earlier restrained,
colour-only reference instruction. All three checks stay in order in Git history.

## Completed changes

- [x] Student navigation has exactly three destinations in order: **Darslar**, **Lug‘at**, **Profil**. Desktop uses a sidebar; phone/tablet uses a safe-area bottom bar. Ranking is reached from Profil, and highlights that same navigation item.
- [x] The dashboard uses warm cream surfaces, terracotta rounded buttons, sage progress, a honey progress ring, illustrated Uzbek architecture and a student illustration, following the selected reference.
- [x] A reusable **J coin** badge appears with real balances and rewards. The gold coin has one embossed J and retains its transparent background. Unit marks remain separate from reward coins.
- [x] Lug‘at lists the actual published teaching lessons and their saved vocabulary mastery/review state, linking to the existing preparation/test flow.
- [x] Profil shows the current name, real lifetime balance (including teacher adjustments), finished teaching lessons, mastered vocabulary, and the student's current ranking. Failed reads show an unavailable state rather than invented zero statistics.
- [x] Ranking retains dense equal-score ranks and the existing safe DTO. No IDs, groups, grading keys or links to another student's account are added.
- [x] Lesson windows, inputs, practice feedback, vocabulary preparation, audio controls, dialogs and exam/retry states use consistent student colours and rounded surfaces. Next/Previous still updates local state before asynchronous persistence.
- [x] Teacher dashboard, students, adjustments, history, review, question analysis, tables, filters and controls inherit a separate dark palette. Student navigation is absent from teacher pages.
- [x] Student name entry follows the illustration style while preserving name-only access and the exact private teacher entry.
- [x] No Unit 2 curriculum, fake streaks, placeholder rankings or decorative statistics are introduced.

## Code review and validation

The source review checks mobile reflow, 44px controls, labels and text alternatives,
focus/reduced-motion support, safe-area navigation, independent teacher colours,
real-data/error states, route authorization, and preservation of the prior reward
and completion services. The shared shell reuses hook identity without a database
query. Global navigation from an active player uses its existing flush/retry
path when answers are dirty; failed saves keep the student in the lesson. Vocabulary keeps the existing two-request home read; only Profil also
loads ranking. Icons use individual package exports rather than processing the
entire icon library. All three optimized WebP assets total under 200 KB.

`pnpm check`, production build, isolated service tests and native GitHub CI are
recorded in the commit/PR. HTTP coverage verifies the new route guards, saved
50-coin result, vocabulary review state, navigation order and teacher separation.
There is no new schema migration or learning-content revision for this check.

The owner explicitly requested **code analysis only, no browser/web opening**.
No app preview or browser visual comparison was performed. Source review cannot
establish pixel-perfect rendering; `design-qa.md` records that visual limitation.

## Rollout

Checks 1 and 2 still require migrations **0009 and 0010** and
`pnpm unit1:publish` for the compact .4 revision before production deployment.
This check is committed after them on the same branch/PR. A feature-branch commit
is not a deployment; production remains unchanged until the rollout is performed.
