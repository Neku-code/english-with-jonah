# Unit 1 implementation

The supplied `Learn_with_Jonah_Unit_1_Complete.zip` is the curriculum source.
Its extracted originals, notes, answer keys and eight PNGs are retained under
`content/source/unit-1/Unit_1/`. Production notes and image prompts are not shown
to students. No Unit 2 material is included.

## Authoring and publication

`scripts/author-unit1.py` is an **offline authoring tool**, using Python/Pillow.
It produces explicit, typed JSON; students never parse TXT files. Review its
explicit task, subpart, control, answer and panel mappings when revising content.

- Display: `src/lib/learning/unit1.json`, typed by `types.ts`.
- Grading, rubrics, dialogue and accepted vocabulary variants:
  `src/lib/server/learning/unit1-keys.json` (server only).
- Content version: `2026-10-19.3`. IDs such as `u1-l1.4-q23-part2`
  identify stable authored entities. Database UUIDs derive from those IDs and
  the content version. Each numbered parent is one question/progress group.
- 1.1–1.5 each have 24 parents; 1.6 has 20. Exam questions 1–16 are worth
  one point, questions 17–20 two points, for exactly 24.
- `pnpm unit1:publish` inserts an immutable revision transactionally. Repeating
  publication is harmless. Changed content requires a new content version;
  existing attempts continue using their original published revision.
- Assets have versioned URLs under `/unit1/2026-10-19.3/`. Eight original PNGs,
  responsive WebPs and 28 explicitly bounded complete panels are preserved.
  The states image uses positional/character labels, without invented A–D labels.

No authored grammar or answer-key error was found that required a source
correction. Presentation adaptations: image/audio file markers become components;
the exam's reference to a separate answer file becomes a post-submission review
instruction; vocabulary file headings are excluded from assessed words. Proper
place names and phrase entries in `words.txt` remain in their original sets.

## Student experience

The existing `/learn/[lessonId]` destination is now the lesson player. It uses
the selected student's server session and real Drizzle/PostgreSQL services.
Lessons retain the supplied order, models, characters, options and task numbers.
Explanations need no check action. Related images have per-task viewer links.
The desktop sidebar becomes a dialog lesson picker below 1100px; phone controls
account for safe-area space and move out of the way of focused writing fields.

Vocabulary remains preparation, with a separate quick-reference dialog in
practice. Selecting **Ko‘rib chiqdim** or passing the vocabulary test opens each ordinary lesson independently. Test mastery earns 30 coins once; review alone earns none.
Sampling uses distinct random words, `ceil(words/3)`, typed Uzbek responses and
the existing >=75% rule. A passed result remains passed after later failures.
The exam vocabulary list is review; it introduces no additional gate or threshold.
The final exam follows five finished lessons under the existing backend rule.

Practice supports single choice, multi-select, ordering, typed transformations,
corrections, comprehension, personal answers and multiple written subparts.
Tokens have independent IDs and support clicking, removal and Shift+arrow
reordering. Case, whitespace, punctuation and apostrophe variants are normalized.
Ordinary permitted contractions expand for comparison; explicit full/short-form
requests and positive short-answer constraints remain distinct. Unknown written
alternatives and personal answers are pending teacher review. The teacher applies
the supplied rubric to unrecognised exam alternatives. Solo speaking is a
self-check; no pronunciation assessment is claimed.

Finishing practice requires all authored parts answered and checked, completed
listening and resolved teacher reviews, without inventing a score threshold.
The five finished lessons earn 50 coins each. The final exam's >=90% mastery
rule adds 10 coins to each teaching lesson (50 total) once. Vocabulary mastery
earns another 30 per lesson. Unit 1 offers 450 coins; see `check-1.md`. A failed or pending
exam never clears previously earned progress.

## Persistence and teacher integration

`0006_lonely_doctor_spectrum.sql` adds study workspaces, append-only practice
checks, idempotent support events and vocabulary sessions. `0007` supplies the
existing teacher review compatibility with structured/pending responses;
`0008_unit1_history.sql` retains checks and support history. Apply the complete
ordered migration history with `pnpm db:migrate`; do not use schema push.

New session-owned endpoints:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/attempts/:id/check` | Check saved practice answer/revision; retry-safe |
| `POST /api/attempts/:id/study` | Save section/panels; reserve play; record transcript/audio support |
| `POST /api/lessons/:id/vocabulary` | Start/resume sampled vocabulary and submit one card |

Existing attempt start, optimistic answer save and atomic submission endpoints
remain in use. Identical retried saves return the existing revision. Checks
deduplicate by answer revision and retain first and later responses independently.
Local drafts are namespaced by student, attempt and content version, and retry
on reconnect; stale writes are rejected. Workspace state retains section and
panel choices. Submitted answers remain immutable. Teacher attempt details show
real parts, first/retry history, audio plays and transcript usage. Pending written
and unavailable-listening answers appear in the review queue; reviews recalculate
effective results and completion using the original revision.

## Listening

**Audio uses browser `speechSynthesis`, not recordings.** The package contains
scripts only and no existing recording service is configured. The player waits
for an English voice, speaks only the actual dialogue, preserves turns, and
supports stop and replay. Navigation stops playback. Practice transcript support
is explicit and recorded. Exam transcript support is hidden until submission.
Two exam play reservations per attempt are persisted and survive refreshes.
Missing or failed audio leaves listening incomplete and its marks pending,
without automatically awarding or deducting those marks.

## Validation and deployment

Automated coverage is in `tests/unit1.test.ts`, alongside the repository's
existing backend/HTTP/teacher tests. It uses a disposable local PostgreSQL server,
never production fixtures. `scripts/verify-unit1.ts` additionally checks live
Neon publication and reviewed synthetic work, and refuses any branch except its
explicitly named temporary verification branch/endpoint.

Screenshots and final observed validation are recorded in `unit-1-validation.md`.
Production compilation succeeds, but the local Vercel adapter still encounters
Windows `EPERM` when creating dependency symlinks. A complete Linux/Vercel package
build and hosted deployment are separate from this local implementation.
