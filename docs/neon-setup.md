# Neon connection and verification — 19 October 2026

## Box 6 follow-up

The committed migration sequence through `0008_unit1_history` is applied to the
connected production database. Box 6 teacher session/review tables, the effective
answer view and response-presence helper are verified by `pnpm db:check`.
Private `TEACHER_ENTRY_NAME` is configured in ignored `.env.local`; copy the
owner-supplied exact value into Vercel's private server environment separately.

An expiring `codex-box6-verify-20261019` child branch verified lifecycle operations,
immutable responses/automatic grades, idempotent review saves, score amendments,
completion recalculation and first-submission statistics. Its fixtures existed
only on that isolated branch. The branch and ignored credential file were deleted
afterward. The branch-creation CLI included a temporary connection credential in
tool output; subsequent CLI output was filtered and no credential is committed.

A production-connected HTTP smoke check passed teacher entry, all four admin
sections, anonymous protection and logout/session revocation. Student, unit,
question and attempt counts were unchanged. No production fixtures were inserted.
All temporary local web servers used by these checks were stopped.

Current checks: 28 automated tests pass. Type checking reports zero errors;
three warnings concern concurrently added lesson UI state initialization, outside
the teacher panel. Browser checks at 320, 390 and 1366 pixels passed empty and
populated views plus a review save, without horizontal overflow or browser
exceptions. Client/server production compilation passes; Vercel adapter packaging
still fails with the previously documented Windows symbolic-link `EPERM`, even
outside the sandbox. See [Box 6](box-6.md) for contracts and counting rules.

The original setup evidence below predates the user's [name-entry correction](name-entry.md).
Student entry now creates new names automatically and reopens existing profiles;
the historical unknown-name and duplicate-selection checks below describe the
earlier requirement.

The name-entry follow-up was tested on a disposable Neon branch and migration
`0005_unique_student_names` is applied to production. See [current verification](name-entry.md#verification-on-19-october-2026) for the observed results and cleanup.

## Connected project

- Organization: `org-rough-leaf-69948636`
- Project: `still-violet-49747793`
- Production branch: `production` (`br-noisy-river-a1i0am6z`)
- Services: PostgreSQL only, declared in `neon.ts`.
- Neon CLI: 8.8.0, authenticated with the user's browser session.

`npm i -g neon@latest` completed. This Codex environment initially lacked npm/npx
and Git on PATH; npm's launcher was bootstrapped and the bundled Git directory
was added to the task's command environment. The requested
`npx neon skills -y` then succeeded. Skills live in `.agents/skills/`, with source
hashes recorded in `skills-lock.json`. They are available to subsequent turns.

`neon init -y --org-id org-rough-leaf-69948636 --project-id
still-violet-49747793 --branch production --services postgres` created `neon.ts`
and ignored `.neon` context. Init installed the Neon plugin for the detected
Codex and VS Code clients. The Codex plugin contains an HTTP MCP server named
`neon` at `https://mcp.neon.tech/mcp`. OAuth is performed by the client on first
use; this running chat has not loaded the new MCP tools. CLI authentication and
project access were verified. No duplicate standalone MCP entry was installed.

`neon deploy` applied the reviewed policy and pulled three values into ignored
`.env.local`: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `NEON_BRANCH`. The branch
already matched the PostgreSQL-only policy, so no service changes were required.
No database password, connection string or CLI credential is committed.

## Application wiring

The existing SvelteKit/TypeScript/Drizzle architecture is preserved. The app uses
`pg` with the pooled `DATABASE_URL` and a lazy reusable connection pool.
`attachDatabasePool` from `@vercel/functions` adds the lifecycle handling
recommended for Vercel Fluid compute. Neither Neon Auth nor other Neon services
are enabled; existing registered-name student entry and opaque sessions remain.

CLI scripts and Drizzle now read `.env.local` before `.env`, matching Vite. Process
environment values take precedence over either file. Migrations use the direct
`DATABASE_URL_UNPOOLED` URL and the committed transactional Drizzle migrations.
Neon URLs with `sslmode=require` are explicitly normalized to `verify-full` in
server code so certificate validation stays explicit across pg versions. URLs
are never logged or sent to browser code.

## Verification performed

A temporary child branch, `codex-setup-verify-20261019`, was created from
production. All migrations were applied there before production. Synthetic
students and question tokens existed only on that isolated branch. A real
SvelteKit application process connected to the branch and exercised HTTP entry,
session restoration, home queries, duplicate selection, attempt saving/scoring
and database persistence. The verification branch and its local credential file
were removed afterward.

Observed output:

```text
neon deploy
No changes — branch production already matches the policy.
Utilized services: Postgres
Pulled 3 Neon variables into .env.local

node --env-file=.artifacts/neon-verify.env scripts/migrate.mjs
Database migrations applied.

node --env-file=.artifacts/neon-verify.env --import tsx scripts/verify-neon.ts
PASS registered-name normalization, HttpOnly session, remembered profile and empty home
PASS published catalog, start/resume, persisted answers, stale-save rejection and student isolation
PASS objective scoring, idempotent submission, persisted progress and pending teacher review
PASS profile switching revokes the server-backed session
PASS Neon PostgreSQL end-to-end verification (codex-setup-verify-20261019)

pnpm db:migrate
Database migrations applied.
pnpm db:check
Database connected; Boxes 2 and 3 schema is ready.
Production row counts: {"students":"0","units":"0","lessons":"0","questions":"0"}

pnpm check
svelte-check found 0 errors and 0 warnings
pnpm test
tests 15
pass 15
fail 0

Local smoke check against the production-connected application
Production-connected entry HTTP 200
Unknown registered name HTTP 400
```

`scripts/verify-neon.ts` refuses production and the production endpoint. To repeat
it, create a fresh disposable `codex-setup-verify-*` child branch, pull its variables
into an ignored file with `neon env pull --branch NAME --service postgres --file
.artifacts/neon-verify.env`, apply migrations using Node's `--env-file` as above,
and run the verifier. Keep `.env.local` pinned to production. Delete the temporary
branch after verification. Ordinary `pnpm test` continues to use isolated local
PostgreSQL, without touching Neon or reading production data.

## Build limitation and remaining setup

The exact requested `npm run build` command was run. Client and server compilation
succeeded, but Vercel adapter packaging failed on Windows:

```text
Error: EPERM: operation not permitted, symlink ... -> ...catchall.func/node_modules/drizzle-orm
```

This is the existing Windows symbolic-link restriction recorded in Box 1.
No dependency source or OS security setting was modified. WSL is not installed
on this host. The full production package still needs a successful build on an
environment that permits the adapter's symlinks, such as the existing Linux CI
or Vercel build environment. A full successful build or deployment is not claimed.

Run locally with `pnpm dev`. Production has no students or curriculum. Register
actual students through `pnpm students add --name "Registered full name"
--group "Group label"`. On Vercel, set the pooled `DATABASE_URL` separately as a
private server environment variable. No frontend Vercel project or deployment was
created by `neon deploy`; it configures Neon backend services only.
