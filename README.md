# English with Jonah

A responsive English learning web application for a university group of approximately 20 first-year students who are learning English from complete beginner level.

Built with SvelteKit, TypeScript, responsive CSS, Neon PostgreSQL, and Drizzle ORM. Hosting target: Vercel with deployments from this GitHub repository.

## Box 1 — Project setup and shared design

Implemented locally:

- A plain setup verification page for **v0.1: Unit 1 — To Be**.
- `/foundation` specimens for verifying Clay & Sage colours, provisional DM Sans typography, reusable buttons, labelled inputs, feedback, badges, progress examples, and phone/PC reflow.
- Server-only Neon/Drizzle connection code and an initial application metadata migration.
- A minimal `/api/health` endpoint, Vercel adapter/configuration, pinned dependencies and a lockfile, and GitHub Actions compiler/build checks.

The user will provide the application design later. Box 1 is technical setup and component verification, not application screen design. Lessons, sign-in, grading, student records, and teacher administration are later boxes. The component form does not save names. **Unit 2: Present Simple is outside v0.1.**

Live Neon provisioning and Vercel deployment must be verified after those accounts are connected. See [Box 1 status and handoff](docs/box-1-setup.md).

## Run locally

Use **Node.js 24** and **pnpm 11.25.0** (the `packageManager` field pins this version).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the Local URL printed by Vite. `/` is setup status; `/foundation` is the component verification page. These pages work without a database connection.

```sh
pnpm check
pnpm build
```

`check` runs Svelte and TypeScript diagnostics. `build` compiles the application and packages it with the Vercel adapter. On Windows, adapter packaging requires permission to create symbolic links; the same build also runs on Linux in GitHub Actions and Vercel. If Windows denies symlink creation, `pnpm dev` and `pnpm check` remain available; do not modify dependency source to bypass the error.

## Connect Neon

1. Create a Neon PostgreSQL project for this app.
2. Copy `.env.example` to `.env` and enter the pooled connection URL as `DATABASE_URL`. Optionally set `DATABASE_URL_UNPOOLED` for migrations.
3. Apply the committed migration and verify connectivity:

```sh
pnpm db:migrate
pnpm db:check
```

Keep `.env` private. Never paste connection URLs in issues, browser code, or commits. Add the URL separately to Vercel's server environment. For future schema edits, run `pnpm db:generate`, review the generated SQL, commit it, then apply it to the intended database. Migration scripts run manually, never as part of the app build. The HTTP migrator does not wrap migration files in transactions; review failed migrations before retrying.

Box 1's only table is `app_metadata`; student and session schemas await the identity decisions in the project brief. The public health endpoint reports app availability only; use `db:check` for database verification.

## Deploy to Vercel

1. Import `Neku-code/english-with-jonah` into the intended Vercel account.
2. Keep the framework preset **SvelteKit**, repository root **`.`**, Node.js **24**, and the commands in `vercel.json`.
3. Use separate Neon databases or branches for preview and production. Add `DATABASE_URL` to the matching Vercel environment; do not point pull-request previews at real student data.
4. Apply migrations to the intended database, deploy `main`, then verify `/`, `/foundation`, `/api/health`, and `pnpm db:check` against that environment.

Vercel's Git integration should deploy `main` to production and pull requests as previews. This link must be established in the account; committing `vercel.json` alone does not create it. Resolve returning-student identity and server-side teacher authorization before collecting real student data.

## Project references

- [Project brief](docs/project-brief.md): audience, account entry, and teacher abilities.
- [Technical stack](docs/technical-stack.md): framework, database, styling, and hosting.
- [Design guidelines](docs/design-guidelines.md): Clay & Sage palette and phone/laptop requirements.
- [Version roadmap](docs/roadmap.md): v0.1 and v0.2 boundaries.
- [Levels and mastery](docs/levels-and-mastery.md): lesson completion, unit points, and the 90% final exam mastery threshold.
- [Vocabulary](docs/vocabulary.md): vocabulary before each lesson, typed Uzbek translation exams, one-third word samples, and the 75% pass threshold.
- [Agent instructions](AGENTS.md): guidance for future GPT and coding-agent sessions.

## Current priority

Build v0.1 around the verb **To Be**, student learning and progress, and teacher administration. Support both phones and laptops from the beginning.
