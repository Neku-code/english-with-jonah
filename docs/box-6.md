# Box 6 — Teacher workspace

Implemented at `/admin` using the existing SvelteKit, Drizzle and Neon backend.
No student, lesson, question, attempt or progress seed data is included. The
panel works with an empty curriculum and queries future records automatically.

## Entry and environment

Set **`TEACHER_ENTRY_NAME`** in private server configuration to the exact entry
value supplied by the owner in the Box 6 request, including capitalization. The
workspace's ignored `.env.local` is configured. `.env.example` intentionally
contains no populated value. Set this variable separately in Vercel's server
environments alongside `DATABASE_URL`; keep `DATABASE_URL_UNPOOLED` for migration
scripts. Never use a `PUBLIC_` or `VITE_` prefix. Builds need no database or key.

The original name form submission is compared on the server before student
normalization. Whitespace, case variants and partial matches do not grant a
teacher session. The configured normalized name is reserved from ordinary
student creation, rename and reactivation. The role never comes from a student
record. This implements the owner's chosen single-field teacher entry; there is
no password, email or second verification step.

Teacher sessions are separate PostgreSQL records containing SHA-256 token hashes,
a stable session ID, absolute 12-hour expiry and revocation timestamp. The
`ewj_teacher` cookie is HttpOnly, SameSite=Lax and Secure outside development.
Teacher entry revokes the previous student identity; ordinary student entry and
`POST /switch` revoke teacher identity. Logout preserves review audit attribution
while ending the session. The server hook guards all `/admin` and `/api/admin`
requests, including SvelteKit data loads and actions. Each loader/action also
checks the role. Mutations require same-origin forms and recheck/lock the live
teacher session inside the transaction. No public management API is added.

The user's subsequent correction retains automatic student creation: a new
normalized name creates one profile; an existing name enters its existing active
profile. Duplicate names cannot create separate identities, even with different
group labels. The teacher sees an explicit conflict. Archived names remain
reserved until reactivation or rename. See [name entry](name-entry.md).

## Student management and history

Students can be added, renamed, archived and reactivated with their existing
stable IDs. The optional group uses the existing field. Archive deletes active
student sessions and blocks entry; it retains all answers, attempts and progress.
Repeated add requests share a transaction receipt and cannot create two profiles.
Other lifecycle writes are idempotent and serialize with learning writes through
the student row. Names use exactly the existing lookup normalization.

Search and active/inactive filters are server-side; tables use 20-row pages.
Each profile shows last learning activity, completed and ongoing lessons, unit
points/mastery, exam results, vocabulary results and separate attempt history.
Never-started and in-progress/not-submitted states are distinct. Historical
attempt inspection uses its `version_id`, including unpublished older content.
Prompts, options, media and grading rules come from that revision. Missing content
is labeled explicitly; saved responses are retained. Teacher reads and review
saves never touch `last_learning_at`, `started_at`, `submitted_at` or `updated_at`
on a submitted attempt.

## Review rules

`teacher_reviews` is an append-only assessment history referencing the existing
answer and teacher session. Original `answers.response`, automatic points and
automatic status remain immutable. `effective_answers` overlays the latest review
without exposing grading rules in student DTOs. Students receive only their own
effective answer score/status and feedback through the existing owned endpoint.

The queue lists submitted, nonblank responses requiring teacher assessment,
including manual written/text questions and automatic outcomes marked pending.
It filters by student/lesson, and previously reviewed responses can be reopened.
Each save records points, feedback, timestamp and incrementing review revision.
Points are whole numbers from zero to the revision's configured maximum. An empty
points field saves feedback while leaving the original pending result pending.
Missing scoring configuration permits feedback only; no maximum or passing
threshold is invented. Current schema constraints already require positive
question maxima for ordinary new content.

A request UUID makes identical retries idempotent. An expected review revision
rejects stale edits. Session, student and attempt locks serialize concurrent saves.
Review insertion, effective attempt totals and affected completion updates use
one transaction. Database triggers protect immutable answers/reviews and reject
attempt totals inconsistent with effective answer grades. Failed writes roll back
the review, totals and completion together.

Completion reuses the revision's existing `manual`, `all_answered` or explicit
`score` policy. A manual policy never receives invented automatic completion.
Amendments reconsider all submitted attempts for that student/lesson; another
qualifying attempt retains completion. Correcting the only qualifying review
can remove that completion. Repeated attempts do not award duplicate points.
Final exam mastery continues to derive from all fully reviewed results at 90%
or above and the existing lesson prerequisite. A later failed retry does not
remove an earlier valid pass; amending that original pass can change its result.

## Analytics and overview definitions

- Active students: `students.status = active`.
- Started students: distinct profiles with a lesson attempt or vocabulary result,
  including inactive profiles with history.
- Submitted attempts: all `lesson_attempts.status = submitted`, including retries.
- Awaiting review: effective pending answers in submitted attempts.

Question performance uses each student's **first submitted attempt per lesson
content version**, ordered by submission date then stable attempt ID. Questions
and versions remain separate. A missing/blank answer is unanswered, including
structured responses whose parts are all empty. Pending responses are separate.
For nonblank graded answers, full points count as correct and lower/partial points
as incorrect. `incorrect_percent = 100 × incorrect / (correct + incorrect)`;
no graded denominator displays a dash. Sample sizes are always shown and fewer
than five graded students are labeled a small sample. Archived students remain
in historical statistics. Filters use real lesson records; retries do not alter
the comparison sample. Empty results and database errors have distinct UI states.

## Verification

Observed on 19 October 2026: 28 tests pass; type checking has no errors (three
warnings in concurrently added lesson UI). Isolated Neon verification and the
production teacher login/read/logout smoke check pass. Production migrations are
applied and the temporary Neon branch was removed. No production student or
learning fixture was inserted. The client build was checked for private database
credentials and the configured teacher-entry value; none were embedded.

Run `pnpm check`, `pnpm test`, `pnpm build`. Automated tests create a fresh isolated
local PostgreSQL cluster, apply all migrations twice and destroy it afterward.
They do not read production credentials. The Box 6 tests cover exact teacher
entry, direct-request authorization, logout/session replay, lifecycle operations,
duplicate saves, immutable history, score/progress amendments, transaction
rollback, 90% mastery, versioned statistics and empty/error states.

`scripts/verify-box6.ts` provides additional Neon verification. It requires a
temporary `codex-box6-verify-*` branch and explicitly refuses the production
endpoint. Pull that branch's env into an ignored file, apply committed migrations
there and run the verifier with Node's `--env-file`. Never run fixtures against
production. Remove the temporary branch after verification.

Visual QA uses isolated synthetic data at 320, 390 and 1366 pixels, covering
empty views, student forms, populated review/statistics tables and review saves.
Tables reflow into labeled records on phones. Production client/server compilation
passes; full Vercel packaging remains subject to the existing Windows `EPERM`
symbolic-link limitation. Linux CI/Vercel must complete that packaging check.
