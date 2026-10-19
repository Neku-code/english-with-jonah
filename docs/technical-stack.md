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
- Student/session schemas and the identity mechanism remain open.
- The user created `Neku-code/english-with-jonah`. Neon and Vercel provisioning and live verification are tracked in the Box 1 handoff.

## Data requirements

The selected database must support the following information. This list describes requirements, not a finalized schema:

- Students and their profiles.
- Lessons and learning activities, with their storage approach still to be decided.
- Student answers and attempts.
- Per-lesson vocabulary sets, English words and accepted Uzbek translations, vocabulary exam attempts, and pass results. See [Vocabulary](vocabulary.md).
- Scores and grading results.
- Student learning progress.

The exact grading rules and progress calculations remain open.
