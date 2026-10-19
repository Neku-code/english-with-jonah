# Vercel deployment — 19 October 2026

Public app: **https://english-with-jonah.vercel.app**. Friends can open this
address without a Vercel account, enter a new name to create a profile, or enter
their existing name to return to saved work.

The Vercel CLI is authenticated. A project was created because this account had
no existing projects:

- Team: `yunusneku-6545`
- Project: `english-with-jonah`
- Project ID: `prj_Fh8fXo5YLAop5Hu8CXNYxCxBS0c3`
- Settings: https://vercel.com/yunusneku-6545/english-with-jonah/settings/environment-variables

`DATABASE_URL` and `TEACHER_ENTRY_NAME` are saved and verified as **Production
Secrets**. Values came from ignored `.env.local`, passed directly to the CLI's
stdin, and were never printed or committed. They are not assigned to Preview or
Development. Preview deployments need their own isolated database configuration.

The local project is linked and deployed through the authenticated CLI. The
complete production build passed on Vercel's Linux machine with Node.js 24 and
the pinned pnpm commands in `vercel.json`. Deployment
`dpl_CYzncp2oAoCBzRYpXeztNnumNoPz` was promoted to the public address above.
The team-scoped deployment alias retains Vercel protection; share the public
app address. Source is commit `d6f1f4c` plus `.vercelignore`, which excludes
private environment files, local tooling and obsolete image copies.

Production Neon has all nine migrations and six published Unit 1 revisions for
content version `2026-10-19.3`. No synthetic student or learning records were
created by deployment verification.

Checks passed: `pnpm check` (zero errors/warnings), all 31 isolated PostgreSQL
tests, remote production build, public entry and health, protected admin
pages/data/actions/APIs, real teacher entry and all four sections, secure
HttpOnly session, logout and revoked-session denial. Private values were absent
from checked HTML, and student/learning record counts stayed unchanged.
Headless Edge checks at 390×844 and 1440×1000 passed for entry and all teacher
sections with no page overflow, browser exceptions or server errors.

Automatic GitHub deployments remain pending: `vercel git connect` for
`Neku-code/english-with-jonah` returned **You need to add a Login Connection to
your GitHub account first.** Connect GitHub in the owner's Vercel account, then
connect the repository to this existing project. Direct CLI production
deployment already works; the public app is usable now. Preview deployments
must use an isolated database.

Local Windows adapter packaging still encounters its symbolic-link `EPERM`
restriction; the successful remote Linux build resolves the hosting blocker.
