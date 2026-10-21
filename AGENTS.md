# Project instructions for GPT and coding agents

## Read first

Read these reference documents before planning or changing the application:

1. `docs/project-brief.md`
2. `docs/technical-stack.md`
3. `docs/design-guidelines.md`
4. `docs/roadmap.md`
5. `docs/levels-and-mastery.md`
6. `docs/vocabulary.md`

## Confirmed requirements

- Build an English learning web application for approximately 20 university freshmen starting from complete beginner level.
- Use SvelteKit and TypeScript for the application and backend, responsive CSS for styling, Neon PostgreSQL for storage, Drizzle ORM for database access and migrations, and Vercel for hosting with GitHub deployments.
- The current release is **v0.1**, covering **Unit 1: To Be** only.
- **Unit 2: Present Simple** belongs to **v0.2**. Do not add it to v0.1 without a new user instruction.
- Students enter any name: a new name creates a profile, and an existing normalized name opens that saved profile. No pre-registration is required. The teacher can optionally add students.
- Teacher entry compares the original submitted value against private `TEACHER_ENTRY_NAME` exactly, before student normalization. Use separate teacher sessions; never grant roles from student names. The owner requested no additional authentication step. See `docs/box-6.md`.
- The administrator can add and remove students, monitor students, and view their progress.
- Use the Clay & Sage palette from the design guidelines.
- Treat phone and laptop usability as equally important throughout implementation and verification.
- Each unit has five teaching lessons and its sixth entry is the final exam. Each teaching lesson has short sequential windows, no sublessons and no lesson-level exam. New questions are automatically correct/incorrect, and all practices must be correct to finish without teacher review. The teacher can independently add/subtract coins with history. Each teaching lesson earns 50 coins once; passing its vocabulary test earns 30 coins once. A final exam score of at least 90% grants mastery and 10 more coins per teaching lesson. Unit 1 has five teaching lessons plus final exam 1.6 (450 possible coins). Rankings use saved lifetime coins. Repeated tasks/attempts/revisions never pay twice. Follow `docs/levels-and-mastery.md` for details and unresolved rules.
- Vocabulary precedes each lesson, with sets named Vocab 1.1, Vocab 1.2, and so on. Students study the list, then take a typed English-to-Uzbek flashcard exam on one-third of that set's words, with feedback per answer and a pass threshold of at least 75%. Selecting **Ko‘rib chiqdim** unlocks the matching lesson without coins; **Test topshirish** masters its vocabulary and gives 30 coins once at >=75%. See `docs/vocabulary.md` for sampling and persistence rules. Do not confuse vocabulary passing with the 90% unit mastery threshold.

## Working conventions

- Keep confirmed requirements separate from implementation suggestions and unresolved decisions.
- Do not silently change the selected stack, release scope, palette, or requested entry flow.
- The user explicitly accepts that anyone knowing a student's name can open that profile. Preserve this name-only classroom access model; do not add passwords or require a registered roster. Keep administrator authorization separate.
- Store database credentials in server-side environment variables; never expose them to browser code or commit them.
- Update the reference documents when the user changes a requirement or settles an open decision.
- Keep beginner-facing language and navigation simple.

## Current repository state

Boxes 2–3 implement the PostgreSQL schema, reusable backend services, student entry and home. The latest user correction supersedes registered-only entry and duplicate selection: one normalized name identifies one profile, automatically created on first entry. See `docs/name-entry.md`. Preserve the existing teacher-session work and reserved administrator name. Read `docs/boxes-2-3.md` and the README for setup and contracts. Do not add curriculum, the lesson player or vocabulary UI without a new instruction. Preserve immutable published content and attempt history. The student CLI is optional. Vercel hosting remains unverified.

Neon follow-up: project `still-violet-49747793`, branch `production`, is connected
and migrated; see `docs/neon-setup.md`. `.env.local` contains private production
credentials. Never print them or run synthetic fixtures against production. Test
migrations and learning fixtures on an isolated temporary Neon branch. Neon
skills are installed under `.agents/skills/`; the Neon plugin includes its MCP
server. Vercel hosting remains unverified and Windows adapter packaging still
requires OS permission for symbolic links.

## Box 6 follow-up

Vercel deployment follow-up: project `english-with-jonah` under team
`yunusneku-6545` now holds private Production Secrets `DATABASE_URL` and
`TEACHER_ENTRY_NAME`. The complete app is deployed and publicly verified at
`https://english-with-jonah.vercel.app`. Remote production build, teacher-session
flow and phone/desktop checks pass. This supersedes earlier hosting-unverified
notes. See `docs/vercel-setup.md`. Automatic GitHub deployment still requires
the owner's GitHub Login Connection in Vercel; direct CLI deployment works.

[Box 6](docs/box-6.md) implements protected teacher sessions, the teacher workspace, student management, versioned attempt inspection, transactional written review and real question statistics. The owner explicitly chose exact server-configured entry through the existing name field, without another authentication step. This supersedes the earlier administrator-authorization open decision. Student automatic creation and same-name access follow the later confirmed correction. No lesson content is added by Box 6.

## Unit 1 follow-up

The user has now authorized the curriculum, lesson player, vocabulary UI and
teacher integration using `Learn_with_Jonah_Unit_1_Complete.zip`. These are
implemented; read `docs/unit-1-implementation.md` and `docs/unit-1-validation.md`.
The original 140-question revision is archived; the second check now authorizes a shorter 80-question revision (five lessons × 12 practices plus the 20-question unit exam). Preserve old attempts and original assets, and publish new immutable revisions. Display content and grading keys are separate;
published revisions and asset URLs are versioned. Publish with
`pnpm unit1:publish`, never synthetic fixtures against production. Browser TTS
is the current audio fallback. Unit 2 remains outside scope.

## First check — rankings and rewards

The 19 October first-check requirements supersede the earlier 50/50 scoring
and test-required vocabulary unlock. Read `docs/check-1.md`,
`docs/levels-and-mastery.md` and `docs/vocabulary.md`. Apply migration 0009
before deploying this feature. Rewards are append-only and keyed by student,
stable lesson ID and kind; preserve historical attempts and teacher reviews.
The second problem/fix check and third visual redesign remain separate work.

## Second check — current learning flow

Read `docs/check-2.md`. Content .4 uses windows inside one lesson, binary
automatic grading and a `practice` completion policy requiring every answer
correct and checked. No teacher review or extra lesson exam is needed.
The final correct check completes/awards once. Teacher coin adjustments are
separate append-only receipts, included in ranking balances.
Apply migration 0010 and `pnpm unit1:publish` before deploying. Old revisions
and drafts remain intact. The user requested code-only verification for this
check: do not open the browser, web app or live site. Investigate repeated
failures with a different method; on a fourth recurrence stop and report.
The third visual redesign is still separate work.

## Third check — selected visual reference

The selected desktop/mobile reference now authorizes the illustrated student
redesign; see `docs/check-3.md` and updated `docs/design-guidelines.md`. Student
nav order is Darslar, Lug‘at, Profil, with ranking within Profil. Use the J coin
badge and consistent lesson styling. Teacher pages have a separate dark night
theme. This supersedes the earlier illustration restriction and colour-only
reference instruction. Preserve checks 1 → 2 → 3 in commit order. The owner
requested code analysis only for this check as well; do not open the app in a
browser or claim visual verification.

## v0.2 authorization — 21 October 2026

The owner now explicitly authorizes Unit 2 Present Simple, matching vocabulary,
ranking/navigation/asset improvements, performance fixes, and production deployment.
This supersedes earlier statements limiting scope to Unit 1. See
[docs/v0.2-present-simple.md](docs/v0.2-present-simple.md)
for the five lessons, final exam, 450-coin unit budget, publication and validation.
