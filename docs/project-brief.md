# Project brief

## Purpose and audience

Create an English learning web application for the owner's university group of approximately **20 students**. The students are **university freshmen** learning English from **complete beginner level**.

Students will use both **phones and laptops**. The application must fit and work comfortably on both.

Confirmed application name: **English with Jonah**, confirmed by the user during Box 1 setup.

Box 1 covered technical setup and plain shared-component verification. The Boxes 2–3 request now authorizes a restrained Clay & Sage student entry and home interface; reference images establish colours only, not layouts.

## Learning structure

Unit 1 is now authored from the owner's complete ZIP: 1.1 Introduction “To Be”,
1.2 Locations and states, 1.3 Negative statements, 1.4 Yes/No Questions,
1.5 Complex questions, and 1.6 Final test. Student instructions are Uzbek.
The five lessons each contain 24 tasks; the exam contains 20 tasks worth 24
points. Personal answers and unrecognised alternatives use teacher review.
See [implementation and source-preservation decisions](unit-1-implementation.md).

| Unit | Topic | Release |
| --- | --- | --- |
| Unit 1 | To Be | v0.1 — current scope |
| Unit 2 | Present Simple | v0.2 — future scope |

The application will support lessons, student profiles, answers, grading, scores, and progress, with a teacher dashboard for monitoring students. Each unit will have approximately 5–7 lessons and a final exam. Finished lessons collectively earn 50 points; scoring at least 90% on the final exam grants mastery and the remaining 50 points. Below 90%, existing progress remains unchanged and the unit is not mastered yet. See [Levels and mastery](levels-and-mastery.md) for the full rules. Specific lesson content, exercise formats, and detailed grading rules still need to be defined.

## Student entry and experience

Before each lesson, students study its matching vocabulary set (for example, Vocab 1.1 or Vocab 1.2), then take a flashcard-style exam covering one-third of that set's words. They see an English word, type its Uzbek translation, and receive feedback after each answer. The vocabulary pass threshold is at least 75%. The working interpretation is that passing opens the matching lesson. See [Vocabulary](vocabulary.md) for confirmed rules and implementation assumptions.

The requested flow is:

1. A student visits the website.
2. The student enters their name.
3. The student enters their account and starts learning.

Updated by the user's entry-flow correction: students may enter any name without pre-registration. If its normalized name exists, open that saved profile. Otherwise, create a new profile and enter it immediately. One normalized name identifies one profile. There are no prefilled student names or seed accounts. Teacher registration and the CLI are optional. See [Name entry](name-entry.md).

The database should save student records, answers, scores, and learning progress.

## Teacher and administrator experience

The application owner is the administrator and teacher.

Box 6 uses the exact value supplied by the owner in private `TEACHER_ENTRY_NAME`
configuration. The existing name form checks the original submission on the
server, before student normalization, and creates a distinct server-backed
teacher session. Capitalization and whitespace must match exactly. The owner
explicitly requested no additional authentication step. A student display name
never grants the teacher role. See [Box 6](box-6.md).

The administrator must be able to:

- Add new students.
- Remove students.
- Monitor students.
- View each student's progress.

## Identity and access decisions

The user explicitly accepts name-only classroom access: anyone knowing another student's name can enter that profile, including from another browser. Names are shared in person or through the teacher, not through a public roster or discovery feature in the app. This is a settled requirement, not an unresolved student-authentication decision. Administrator entry remains separate from student accounts.

Settled requirements:

- Returning browsers use an opaque 30-day server session with an HttpOnly cookie.
- New names create profiles; exact normalized existing names reopen them with saved answers and progress.
- Normalize case, surrounding/repeated whitespace and Uzbek apostrophe variants consistently; never fuzzy-match a different name.
- A database unique index prevents duplicate profiles for one normalized name, including simultaneous first visits. Teacher add/rename operations follow the same rule.
- Archived names remain reserved and blocked until the teacher restores or renames the profile; entry never silently replaces their history.
- Removing a student archives records and revokes sessions; learning history is retained.

The following details remain unresolved for a real-data launch:

- Additional teacher dashboard summaries beyond the lesson completion, points, exam results, and mastery measures specified in the mastery reference.

Preserve the confirmed name-only student entry experience. Do not reintroduce a registered-student requirement or stronger student identity checks without a new instruction.

## Box 6 follow-up

[Box 6](box-6.md) implements protected teacher sessions, the teacher workspace, student management, versioned attempt inspection, transactional written review and real question statistics. The owner explicitly chose exact server-configured entry through the existing name field, without another authentication step. This supersedes the earlier administrator-authorization open decision. Student automatic creation and same-name access follow the later confirmed correction. No lesson content is added by Box 6.
