# Technical stack

## Selected technologies

| Part | Choice | Purpose |
| --- | --- | --- |
| App and backend | SvelteKit + TypeScript | Lessons, profiles, grading, and the teacher dashboard |
| Styling | Responsive CSS | Layouts that work on phones and PCs, including laptops |
| Database | Neon PostgreSQL | Store students, answers, scores, and progress |
| Database code | Drizzle ORM | Connect SvelteKit to Neon and manage database changes |
| Hosting | Vercel | Host the app and deploy updates from GitHub |

## Architectural direction

- Unit 1 display JSON is authored offline and persisted in immutable lesson
  revisions; grading keys remain under server-only modules. Source TXT files
  are never parsed by the student browser. Versioned original/optimized images
  are served as static assets. Browser speechSynthesis provides the current
  English audio fallback; no new service, ORM or hosting provider is introduced.

- Use SvelteKit for the frontend and backend within one application.
- Use TypeScript for application and backend code.
- Build responsive layouts with CSS.
- Persist learning data in Neon PostgreSQL through Drizzle ORM.
- Manage database schema changes through Drizzle migrations.
- Use GitHub as the source repository for Vercel deployments.

## Implementation boundaries

- Database access and credentials belong on the server.
- Administrator actions need server-side authorization when implemented.
- Student data must persist across visits and deployments.
- Box 1 selects and pins application package versions, adds a minimal metadata schema and Vercel build configuration. See [Box 1 setup](box-1-setup.md) and `package.json`.
- Boxes 2–3 add student/session schemas and opaque sessions. The follow-up [name-entry requirement](name-entry.md) creates new profiles automatically and reopens one existing profile per normalized name.
- Drizzle uses `pg` against Neon's native PostgreSQL protocol for row locks and interactive transactions, with Vercel's `attachDatabasePool` lifecycle helper. Connection URLs remain private and lazy-loaded; builds need no database.
- Neon project `still-violet-49747793`, branch `production`, is connected and migrated. `.env.local` contains pooled runtime and direct migration URLs; scripts load it before `.env`. See [Neon setup](neon-setup.md) for live verification and remaining deployment work.
- The user created `Neku-code/english-with-jonah`. Neon and Vercel provisioning and live verification are tracked in the Box 1 handoff.

## Data requirements

The selected database must support the following information. This list describes requirements, not a finalized schema:

- Students and their profiles.
- Lessons and learning activities, with their storage approach still to be decided.
- Student answers and attempts.
- Per-lesson vocabulary sets, English words and accepted Uzbek translations, vocabulary exam attempts, and pass results. See [Vocabulary](vocabulary.md).
- Scores and grading results.
- Student learning progress.

Grading remains revision-specific. Box 6 adds separate teacher sessions and an
append-only review overlay on the existing answer/attempt/progress tables; see
[Box 6](box-6.md). Numeric reviews use the question's existing maximum and the
revision's existing completion policy. No new default threshold is introduced.

## Second-check performance contracts

Home and attempt DTOs each use two database requests. Reads do not take the
student's mutation lock. Batches, checks, completion and teacher coin changes
retain transactional ownership/revision checks. Window navigation updates
client state before an asynchronous coalescing checkpoint, and starting can
return player bootstrap data directly. No shared student-data cache is added.
See `docs/check-2.md` for the diagnosis and rollout.

## v0.2 authorization — 21 October 2026

The owner now explicitly authorizes Unit 2 Present Simple, matching vocabulary,
ranking/navigation/asset improvements, performance fixes, and production deployment.
This supersedes earlier statements limiting scope to Unit 1. See
[v0.2 details](v0.2-present-simple.md)
for the five lessons, final exam, 450-coin unit budget, publication and validation.
