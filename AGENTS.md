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
- Students enter their names to get started. The teacher can also add students.
- The requested administrator entry name is exactly `Jonah2009tdiu`. See the project brief for the access model and unresolved identity details.
- The administrator can add and remove students, monitor students, and view their progress.
- Use the Clay & Sage palette from the design guidelines.
- Treat phone and laptop usability as equally important throughout implementation and verification.
- Each unit has approximately 5–7 lessons and a final exam. Finished lessons collectively earn 50 points; a final exam score of at least 90% grants mastery and the other 50 points. An exam below 90% leaves existing progress unchanged. Follow `docs/levels-and-mastery.md` for details and unresolved rules.
- Vocabulary precedes each lesson, with sets named Vocab 1.1, Vocab 1.2, and so on. Students study the list, then take a typed English-to-Uzbek flashcard exam on one-third of that set's words, with feedback per answer and a pass threshold of at least 75%. See `docs/vocabulary.md` for the lesson-unlocking interpretation, sampling defaults, and open decisions. Do not confuse vocabulary passing with the 90% unit mastery threshold.

## Working conventions

- Keep confirmed requirements separate from implementation suggestions and unresolved decisions.
- Do not silently change the selected stack, release scope, palette, or requested entry flow.
- Resolve returning-student identity and administrator authorization before treating a deployment as ready for real student data. A name supplied by a browser is not proof of identity.
- Store database credentials in server-side environment variables; never expose them to browser code or commit them.
- Update the reference documents when the user changes a requirement or settles an open decision.
- Keep beginner-facing language and navigation simple.

## Current repository state

Box 1 has scaffolded SvelteKit and plain shared-component verification. The user will supply the application design later; do not begin application screen design yet. Read `docs/box-1-setup.md` and the README for setup, verification, and external provisioning status. Student identity and learning/admin features remain later work; do not treat the foundation preview as a real-data launch.
