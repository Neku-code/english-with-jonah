# English with Jonah

A responsive English learning web application for a university group of approximately 20 first-year students who are learning English from complete beginner level.

Built with SvelteKit, TypeScript, responsive CSS, Neon PostgreSQL, and Drizzle ORM.
Live app: [English with Jonah](https://english-with-jonah.vercel.app).
See [deployment status and verification](docs/vercel-setup.md).

## Unit 1 — Authored lessons and final test

The supplied Unit 1 curriculum is implemented: five lessons with 24 numbered
tasks each, vocabulary preparation, and a separate 20-task/24-point final exam.
The player saves real answers, checks, retries, sections and support usage through
the existing student backend. Written answers connect to teacher review. Eight
original illustrations have responsive derivatives, full-sheet views and 28
verified panels. Listening uses browser English TTS from the supplied scripts.

Apply migrations with `pnpm db:migrate`, then publish the immutable curriculum
with `pnpm unit1:publish`. Publication is repeatable and creates no students or
attempts. See [Unit 1 implementation](docs/unit-1-implementation.md) and
[validation/screenshots](docs/unit-1-validation.md). The complete production
build passes on Vercel's Linux machine; local Windows adapter symlink packaging
is still restricted.

## Box 6 — Teacher workspace

The existing name page now supports exact server-configured teacher entry and a
separate teacher session. `/admin` includes a real overview, student search and
management, versioned attempt inspection, written-answer review with immutable
history, and question performance based on first submitted attempts. Archiving
revokes access while retaining history; profiles can be reactivated. Empty
learning sections populate automatically from the established database models.

Set private `TEACHER_ENTRY_NAME` to the exact owner-supplied Box 6 value, including
case. It is configured in this workspace's ignored `.env.local`; add it separately
to Vercel. Apply committed migrations with `pnpm db:migrate`. See [Box 6 setup,
counting rules and verification](docs/box-6.md). No production fixtures or
curriculum are created by Box 6.

## Boxes 2 and 3 — Database, student entry and home

Implemented:

- Uzbek name entry: new names automatically create profiles; existing normalized names open their saved profiles. Opaque server-backed sessions and profile switching remember the selection.
- Responsive Clay & Sage student home with a deliberate empty state, real progress/activity and a published-content catalog.
- Relational PostgreSQL schema, immutable content revisions, isolated student attempts/answers, transactional grading and progress, optimistic save revisions and vocabulary readiness.
- Controlled student CLI, committed migrations and automated tests using an isolated real PostgreSQL server.
- Preserved `/foundation` specimens, app-only `/api/health`, Vercel configuration and GitHub Actions checks.

Boxes 2–3 originally created no curriculum. The Unit 1 follow-up above now adds
the lesson player, vocabulary interface and authored content. **Unit 2: Present
Simple is outside v0.1.** The user deliberately allows anyone knowing a student's
name to access that profile. Administrator entry remains reserved and separate.
See [current name-entry rules](docs/name-entry.md).

See [Boxes 2–3 setup and backend contracts](docs/boxes-2-3.md) for schema/versioning, APIs and policies. [Neon setup and verification](docs/neon-setup.md) records the connected production database, successful live checks and remaining Windows/Vercel build limitation.

## Run locally

Use **Node.js 24** and **pnpm 11.25.0** (the `packageManager` field pins this version).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the Local URL printed by Vite. `/` is entry; student sessions go directly to `/home`, and teacher sessions to `/admin`. Entry renders without a database, but registration, entry submission and home data require PostgreSQL. `/foundation` remains the development component verification page.

```sh
pnpm check
pnpm test
pnpm build
```

`check` runs Svelte and TypeScript diagnostics. Tests create an isolated local PostgreSQL cluster with synthetic fixtures and remove it afterward; they never use `DATABASE_URL`. `build` compiles and packages with the Vercel adapter. Windows adapter packaging requires permission to create symbolic links; Linux CI and Vercel run the same build. Do not modify dependency source to bypass OS restrictions.

## Connect Neon

The workspace is linked to project `still-violet-49747793`, branch `production`.
`neon deploy` has pulled the private variables into ignored `.env.local`; all
committed migrations are applied. To refresh the configured connection:

```sh
neon deploy
```

For manual setup, copy `.env.example` to `.env.local`, use the pooled URL for
`DATABASE_URL` and the direct URL for `DATABASE_URL_UNPOOLED`. Scripts load
`.env.local` before `.env`; process-injected variables take precedence. Apply
future migrations and verify connectivity with:

```sh
pnpm db:migrate
pnpm db:check
```

Keep env files private. Never paste connection URLs in issues, browser code, or commits. Use TLS in Neon URLs and add them separately to Vercel's server environment. For schema edits, run `pnpm db:generate`, review/commit SQL, test on an isolated Neon branch, then apply to the intended database. Migration scripts use transactions and run manually, never during builds. Preserve custom triggers in `0002_integrity.sql`.

Students create profiles on first entry; no initial roster or seed accounts are required. Optionally manage students from a trusted shell:

```sh
pnpm students add --name "Registered full name" --group "Group label"
pnpm students list
pnpm students rename --id STUDENT_UUID --name "Corrected full name"
pnpm students archive --id STUDENT_UUID
```

Groups are optional metadata. Each normalized name identifies one profile; use a distinct name for a separate profile. Archival revokes sessions and retains history. The public health endpoint reports app availability only; use `db:check` for database verification.

## Deploy to Vercel

1. Import `Neku-code/english-with-jonah` into the intended Vercel account.
2. Keep the framework preset **SvelteKit**, repository root **`.`**, Node.js **24**, and the commands in `vercel.json`.
3. Use separate Neon databases or branches for preview and production. Add `DATABASE_URL` to the matching Vercel environment; do not point pull-request previews at real student data.
4. Apply migrations, deploy `main`, then verify new-name entry, same-name return, `/home`, switching, `/api/health` and `pnpm db:check` against that environment.

Vercel's Git integration should deploy `main` to production and pull requests as previews. This link must be established in the account; committing `vercel.json` alone does not create it. Keep the confirmed name-only student access model and server-side teacher authorization separate.

## Project references

- [Project brief](docs/project-brief.md): audience, account entry, and teacher abilities.
- [Technical stack](docs/technical-stack.md): framework, database, styling, and hosting.
- [Design guidelines](docs/design-guidelines.md): Clay & Sage palette and phone/laptop requirements.
- [Version roadmap](docs/roadmap.md): v0.1 and v0.2 boundaries.
- [Levels and mastery](docs/levels-and-mastery.md): lesson completion, unit points, and the 90% final exam mastery threshold.
- [Vocabulary](docs/vocabulary.md): vocabulary before each lesson, typed Uzbek translation exams, one-third word samples, and the 75% pass threshold.
- [Boxes 2–3](docs/boxes-2-3.md): setup, initial registration, backend contracts and verified scope.
- [Agent instructions](AGENTS.md): guidance for future GPT and coding-agent sessions.

## Current priority

Build v0.1 around the verb **To Be**, student learning and progress, and teacher administration. Support both phones and laptops from the beginning.
