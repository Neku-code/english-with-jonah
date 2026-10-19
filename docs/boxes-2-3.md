# Boxes 2 and 3: student access and persistence

Box 6 follow-up: [teacher administration](box-6.md) now implements protected
teacher sessions, student lifecycle management, historical attempts, written
reviews and real question statistics. Earlier notes below describing the teacher
panel/review flow as future work are historical. Student entry follows the later
[automatic name-entry correction](name-entry.md), replacing registered-only entry
and duplicate-profile selection.

Follow-up: the production Neon database is now connected and migrated. Live app
checks passed on an isolated Neon branch; see [Neon setup](neon-setup.md). Earlier
missing-configuration notes below describe the original Boxes 2–3 handoff.

The user's subsequent [name-entry correction](name-entry.md) is now implemented:
new names create profiles automatically, existing names open their saved profiles,
and no student roster or pre-registration is required. The original registered-only
and duplicate-selection requirements are superseded.

## Implemented scope

SvelteKit 3 / TypeScript and the existing pnpm lockfile remain in place. Neon is
accessed through Drizzle and `pg` using its PostgreSQL protocol, with a small
connection pool and interactive transactions. Hosting remains Vercel. No
production curriculum, seed students, lesson player, vocabulary UI or teacher
panel is included. `/foundation` retains the original component specimens.

`/` is name-only entry with automatic profile creation, `/home` is the current student's home, and
`POST /switch` revokes the current session. With no published lessons, home
deliberately shows **Darslar hali qo‘shilmagan.** No scores or activities are
invented. Query failures show a retry state. Published units and the latest
published revision of each published lesson are queried automatically. Ordinary
lessons have no sequential prerequisite. A final exam follows its unit's lessons.

`/learn/[lessonId]?attempt=[attemptId]` is a small destination contract: it
checks publication and ownership, identifies the saved attempt, and states that
the lesson window is coming in a later box. It does not display exercises or
silently create an attempt. The future player can use the APIs below.

## Current entry decisions

- New names create active profiles. Existing names open their saved profiles.
- Names use NFKC lookup normalization, lowercase, trimmed/collapsed whitespace,
  and common Uzbek apostrophe variants. Display names retain spelling and
  apostrophes, with whitespace cleaned. There is no fuzzy matching.
- Each normalized name identifies one profile. A unique index prevents duplicate
  profiles even on concurrent first entry. Teacher add/rename operations obey the
  same rule. The old selection-ticket table remains for migration compatibility
  but no selection flow is exposed.
- Sessions use 32 random bytes, SHA-256 hashes in PostgreSQL, a 30-day absolute
  expiry, and an HttpOnly, SameSite=Lax cookie (Secure outside development).
  Expired/invalid cookies clear; archival revokes all sessions. Session lookup
  joins the student's active status on every request. Renames retain identity.
- Removal archives records and retains attempts, answers and progress.
- The supplied visual brief authorizes entry/home design using Clay & Sage.
- Student UI uses Uzbek Latin script. Profile entry grants no teacher powers;
  `Jonah2009tdiu` remains reserved and is not an authentication secret.

The user explicitly accepts that anyone knowing a name may open that profile,
including from a new browser. This name-only classroom access decision is settled.
Names are shared outside the application; there is no public roster or discovery
flow. Teacher authorization remains separate. See [Name entry](name-entry.md).

## Database and versioning

Committed migrations add students, sessions, entry tickets, units, stable lessons,
lesson revisions, revision-specific vocabulary and questions, attempts, answers,
vocabulary results/readiness and lesson completion records. The original
`app_metadata` table is preserved. There are no curriculum INSERTs.

A lesson revision owns its title, content, completion policy, vocabulary
requirement, questions and grading rules. Build children while it is a draft;
setting `published_at` freezes that revision. PostgreSQL triggers reject edits,
deletions, inserted children and moving children into/out of a published revision.
Create a higher numbered draft revision for later edits. The catalog selects the
latest published revision; an unfinished attempt retains its original revision.
Unpublishing a lesson or unit hides it and blocks learning writes. Versioned
lessons cannot change their unit or assessment kind.

Composite foreign keys bind answers to the attempt's student and revision, and
questions to that same revision. Progress and readiness must reference results
owned by that same student and lesson. Indexes support lookup, session expiry,
catalog ordering, recent attempts and answer access. A partial unique index
allows only one unfinished attempt per student/lesson. Submitted attempts and
answers are immutable. Completion is one row per student/lesson; repeats retain
their own attempt history and never grant duplicate completion credit.

Custom invariants live in `0002_integrity.sql`; keep these triggers when evolving
the schema. Use reviewed migrations, not `drizzle-kit push`. Runtime credentials
should have data access only; only controlled migration credentials need DDL.

## Backend contracts

All services live under `src/lib/server/`. They can be reused by future handlers.
Public handlers derive the student ID from the server session. Body-supplied
student IDs are rejected. JSON mutations require an exact same-origin Origin
header and `application/json`. Request bodies are capped at 32 KiB; saved text at
10,000 characters. HTML forms use SvelteKit's same-origin checks. Responses are
private/no-store, and driver errors never reach students or logs.

| Endpoint | Method / JSON body | Result |
| --- | --- | --- |
| `/api/lessons/:lessonId/attempts` | POST `{}` | Start or resume unfinished published lesson |
| `/api/attempts/:attemptId` | GET | Owned attempt, public question fields, saved answers/revisions |
| `/api/attempts/:attemptId/answers` | PUT `{questionId,response,expectedRevision}` | Saved revision |
| `/api/attempts/:attemptId/submit` | POST `{}` | Stable submitted result |

`expectedRevision` is 0 for an absent answer; the server returns 1 after its first
save. Further writes must send the returned revision. Conflicts return 409
`STALE_ANSWER`; reload the attempt before retrying. Saves never overwrite a newer
revision or a submitted attempt. Start/save/submit/archive serialize through the
student row, and attempt writes also lock the attempt. Submission grades answers,
records results, updates progress and activity in one transaction. A repeated
submission returns the existing result. `GET` does not mutate learning state.
DTOs allowlist question content and exclude all grading configuration/answer keys.

Question types currently supported by contracts:

- `choice`: compare the submitted option ID against an explicit correct ID.
- `text`: explicit accepted strings with explicit case/apostrophe normalization,
  or manual grading. No spelling tolerance or partial credit is invented.
- `written`: teacher review only. Nonempty written answers remain pending.
- Missing/blank responses receive zero objective points. Pending totals are
  provisional and cannot finish a lesson or earn mastery.

Completion policy is revision-specific: `manual` (default; never auto-complete),
`all_answered` (all questions nonblank, no pending review), or `score` with an
explicit `minimumPercent` in [0,100]. No default lesson passing threshold is
assumed. Content is validated before start/save/submission. The future teacher
review flow is deliberately not implemented; pending work remains pending.

Home derives lesson points as `50 × finished / published regular lessons`,
rounding only for display. A fully reviewed final-exam result of at least 90%
grants the other 50 after all unit lessons are complete. Successful history
survives later failed exams. Latest exam result is displayed separately; this
latest-result display is an implementation choice. No fractional exam award,
streak, XP or invented intermediate mastery level is added.

`recordVocabularyResult` is internal only. A future trusted evaluator supplies
counts and an idempotent source key. It stores every result, grants
revision-specific readiness at >=75%, and preserves readiness after later failed
results. It does not award lesson completion or unit points. No public API accepts
readiness or client-calculated scores. The vocabulary sampling/evaluation UI and
remaining vocabulary decisions are later work.

## Optional student management

No initial registration is required. Students create profiles on first entry.
For optional teacher management, set private `DATABASE_URL`, apply migrations,
then run from the repository:

```sh
pnpm students add --name "Registered full name" --group "Group label"
pnpm students list
pnpm students rename --id STUDENT_UUID --name "Corrected full name"
pnpm students archive --id STUDENT_UUID
```

The group is optional metadata. Separate profiles require different names. The
CLI prints the stable UUID. It requires trusted shell access and the private DB
credential. It is not a public signup mechanism. CLI errors omit driver details.

## Local and Vercel setup

Node 24 and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
# Copy .env.example to .env; set DATABASE_URL to the Neon pooled URL with TLS.
pnpm db:migrate
pnpm db:check
pnpm dev
```

Optional `DATABASE_URL_UNPOOLED` is used for migrations only. Migrations now use
the native PostgreSQL driver and Drizzle's transactional migrator; an advisory
lock serializes operator migration runs. Builds never migrate or seed data.

On Vercel, retain the SvelteKit preset, root `.`, Node 24 and existing
`vercel.json`. Set `DATABASE_URL` in server-side environment settings. Apply the
committed migrations to each intended environment before deployment. Use separate
Neon branches/databases for previews and production. Student profiles are created
on first entry; no roster is needed. Connect GitHub deployment integration in
Vercel; configuration files alone do not provision it.

## Verification

`pnpm check`, `pnpm test`, and `pnpm build` are the relevant checks. Tests start a
real, isolated PostgreSQL 18 process bound to loopback, apply all migrations twice,
use synthetic records, and destroy that cluster afterward. They never read
`DATABASE_URL` or create OS users. Test data lives temporarily under ignored
`.artifacts/`. Linux CI and Windows x64 package build scripts are explicitly
allowed in `pnpm-workspace.yaml`. Run as an ordinary OS user; PostgreSQL does not
run as root. No Docker, Neon account or preexisting database is needed for tests.

Live Neon connectivity and deployed Vercel behaviour still require private
configuration and external account setup. Local PostgreSQL verification does not
claim to verify Neon networking, production TLS, or Vercel deployment integration.

### Original verification observed on 19 October 2026

These historical checks preceded the name-entry correction. Current regression
coverage is documented in [Name entry](name-entry.md).

- `pnpm check`: zero errors and warnings, including test and CLI types.
- `pnpm test`: 15 passing groups using real PostgreSQL 18 and an HTTP application.
  Covers migration repeatability/no seeded curriculum, name normalization and
  duplicates, CLI lifecycle, session restoration/switching/archival, cross-student
  and cross-revision constraints, concurrent start/save, stale saves, transactional
  rollback, repeat submission, revision immutability, explicit grading, pending
  review, vocabulary 75%, and 89.9% versus exactly 90% mastery boundaries.
- Browser QA at 320×780 and 1366×900: entry, unknown-name feedback, explicit group
  selection, remembered sessions, empty home and profile switching; no horizontal
  overflow. Keyboard focus uses a visible outline. No browser errors or warnings
  were recorded for these checks. Only isolated synthetic students were used.
- Production client/server compilation succeeds. Full `pnpm build` reaches the
  Vercel adapter, then Windows denies its required symbolic link with `EPERM`,
  including outside the sandbox. This is the Box 1 OS limitation; dependency code
  and the adapter have not been patched. Linux CI includes the full build, but no
  remote CI result or Vercel deployment is claimed here.
- `pnpm db:check` reports the exact missing configuration: `DATABASE_URL`. A live
  Neon URL with TLS, migrations and real registered students must be configured
  before classroom use; optional `DATABASE_URL_UNPOOLED` can be used for migrations.
