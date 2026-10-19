# Name entry — confirmed user correction

This supersedes the original Boxes 2–3 requirement for registered-only entry and duplicate-profile selection.

- Any valid new name creates a student profile and enters it in one database transaction with its session.
- An existing normalized name enters that same saved profile, retaining answers, attempts, progress and display spelling. Anyone knowing the name may enter it from another browser; the user explicitly accepts this classroom model.
- Names are shared outside the application. No public roster, profile search, passwords, verification or self-registration form is required.
- The entry field starts empty. There are no seeded or prewritten student accounts. The administrator name is reserved; existing teacher entry remains separate.
- Lookup uses NFKC, lowercase, trimmed/collapsed whitespace and common Uzbek apostrophe variants. Display names retain their original spelling and apostrophes. Different names are never fuzzy-matched.
- One normalized name identifies one profile, regardless of optional group metadata. A unique database index prevents concurrent first visits or teacher operations from creating duplicate profiles. Separate people wanting separate profiles must choose different names.
- Sessions remain opaque, server-backed, HttpOnly and valid for 30 days. “Profilni almashtirish” ends the current session without deleting learning history.
- Existing archival behavior remains: archived names stay reserved, sessions are revoked, and entry shows a teacher-restoration message rather than creating a replacement profile.

Apply migration `0005_unique_student_names.sql` with `pnpm db:migrate` before running the new entry code. It preserves existing profile IDs and learning records. If an older database has duplicate normalized names, the migration stops without choosing or merging a profile; resolve the names through the trusted student-management workflow first. Production was audited before this migration: no students or duplicate names existed. No student or curriculum seed data is added.

`pnpm students add`, `rename`, `archive` and the existing teacher tools remain optional management utilities, not prerequisites for entry. They cannot create or rename a profile onto another profile's normalized name.

Regression coverage uses isolated real PostgreSQL: automatic creation, same-name access from independent browser sessions, normalization, no fuzzy matches, unique-name enforcement, simultaneous first visits, atomic profile/session rollback, reserved administrator names, archived profiles, saved-answer resumption, and progress visibility after re-entry.

## Verification on 19 October 2026

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm test`: 27 passed, 0 failed in the shared workspace, including the student-entry and separate teacher-entry regressions.
- A disposable Neon branch passed the new migration and real HTTP checks for first-name creation, same-name saved-answer access, remembered sessions, empty home, published catalog, start/resume, different-name isolation, stale-save protection, repeat submission, objective scoring, pending review and switching. The app stopped afterward, and the branch was deleted.
- Reviewed migrations through `0005_unique_student_names` were applied to production with Drizzle's transactional migrator and migration advisory lock. Later migrations from concurrent workspace work were left to that work's owner. The post-migration audit reported 6 migration records, the unique-name index present, and no students, duplicate names or units.
- `npm run build`: client/server compilation succeeded; Vercel packaging hit the existing Windows `EPERM` symbolic-link permission failure. A successful full Vercel package is still unverified on this Windows host.

No persistent localhost server was started by this task. No fixtures were inserted into production.
