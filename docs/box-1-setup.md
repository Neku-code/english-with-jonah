# Box 1 — Setup and verification

## Confirmed scope and clarification

Set up English with Jonah, its GitHub repository, Neon connection and Vercel deployment. Verify shared colours, typography, buttons, inputs and responsive phone/PC layouts. The user confirmed the name **English with Jonah** and selected their existing `Neku-code/english-with-jonah` repository.

The user clarified that the application design will be provided later. Do not begin homepage, branding, or application screen design. Box 1 uses plain setup/component specimens only. No source files were uploaded and no specimen was generated in Superdesign; the optional external design upload was declined by the user's clarification.

## Implemented foundation

- SvelteKit 3.1.0, Svelte 5.57.2, TypeScript 6.0.3, Vite 8.3.4, Vercel adapter 7.0.1; exact versions and a lockfile.
- Node.js 24 and pnpm 11.25.0. TypeScript 6 is selected because the current Svelte tooling uses its JavaScript compiler API.
- Confirmed Clay & Sage CSS tokens. Provisional self-hosted DM Sans for readable verification specimens; final typography awaits the design.
- Shared Button, TextInput, Badge and Progress components. Native controls, focus outlines, skip link, announced validation errors, reduced-motion support and 44–48px action targets.
- `/`: plain setup status. `/foundation`: interactive component checks. `/api/health`: app availability only, no database diagnostics or credentials.
- Lazy server-only Neon HTTP/Drizzle connection. Runtime `DATABASE_URL` is private and optional while the setup preview is the only feature. `.env` files are ignored; `.env.example` is empty.
- Initial `app_metadata` table and a generated Drizzle migration. Generation, manual application and connection-check scripts. No student/session tables or personal-data writes.
- GitHub Actions runs frozen install, type checks and full Vercel build on `main` pushes and pull requests. CI needs no database credentials.

## Verification and limitations

- Source uploaded to [Neku-code/english-with-jonah](https://github.com/Neku-code/english-with-jonah), preserving its initial commit. Implementation commit: `92d383f5c05a10c371f1dc8504a70c1c555ef46a`.
- Svelte/TypeScript checks passed with zero errors and warnings. [GitHub Linux checks passed](https://github.com/Neku-code/english-with-jonah/actions/runs/39179193552), including frozen dependency install and the complete Vercel adapter build.
- Plain setup/component pages work locally. Form checks passed: empty-input alert, Enter-key submission, success status, and disabled controls. No browser console errors were observed.
- Phone width 320px and laptop width 1366px: content width equals available client width, with no horizontal overflow. Component columns stack on phones and show two columns on laptops. Keyboard focus is visible.
- `/api/health` returns HTTP 200 and app-only JSON. Missing pages return HTTP 404. The component form does not store the supplied name.
- Vercel's Windows packaging initially fails because the OS denies a required symbolic link after app bundles compile. Linux CI verifies the complete packaging step; local `dev` and `check` remain usable. Do not modify dependency code to bypass OS restrictions.
- `db:check` correctly reports missing configuration without printing credentials. Live Neon migrations/queries await connection.
- `vercel.json` and the adapter configure builds; they do not provision a Vercel project or establish GitHub deployment integration by themselves.

## Remaining external setup

1. Connect Neon and Vercel in this chat or identify existing projects.
2. Provision/identify Neon, configure private environment variables, apply the migration and verify a live query.
3. Import this GitHub repository into Vercel, configure separate preview/production database connections, deploy, and verify the returned URL.
4. Record verified project/deployment links here. Box 1 remains incomplete until external setup is verified.

## Provisional component choices

The five confirmed palette values remain unchanged. A darker supporting clay `#AE5634` gives white button labels 5.02:1 contrast; white on the confirmed brand clay `#B9603C` is only 4.37:1. Muted text `#70665B` on paper is 4.95:1. Supporting shades, provisional font, spacing and component examples do not settle the application design.

## Later boxes

Returning-student identity, duplicate names, matching teacher-created records, protected administrator sessions, and removal behaviour remain unresolved. The exact requested administrator entry name `Jonah2009tdiu` is preserved in the brief and is not an authentication secret. Lessons, vocabulary, grading and administration follow later. Vocabulary passing is 75%; final unit mastery is 90%; Unit 2 remains outside v0.1.
