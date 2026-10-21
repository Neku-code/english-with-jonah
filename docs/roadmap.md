# Version roadmap

## v0.1 — Unit 1: To Be

This is the current implementation target.

### Required scope

- English learning content focused on **To Be** for complete beginners.
- Vocabulary before each lesson, numbered by unit and lesson, with typed English-to-Uzbek flashcard exams on one-third of each set's words, feedback after each answer, and a 75% pass threshold. Reviewing with **Ko‘rib chiqdim** unlocks the matching lesson; passing the test gives 30 coins once. See [Vocabulary](vocabulary.md).
- Name-only student entry: a new name automatically creates a profile; an existing normalized name opens its saved profile. Server-backed sessions remember the current profile. Anyone knowing a name may enter it, as explicitly confirmed by the user.
- Student accounts/profiles and persisted learning data.
- Student answers, grading, scores, and progress.
- Five teaching lessons with twelve automatic practices each and one final unit exam, with Finished lesson statuses, 50 coins per finished teaching lesson, 30 per passed vocabulary set, and 10 more per teaching lesson plus mastery for a final exam score of at least 90%. Rankings order active students by lifetime coins. See [Levels and mastery](levels-and-mastery.md).
- Exact server-configured teacher entry with separate protected server-backed sessions, implemented in Box 6.
- Teacher abilities to add and remove students, monitor students, and view their progress.
- Responsive student and teacher experiences for phones and laptops.
- The confirmed stack and Clay & Sage palette.

### Details still to define

- To Be lesson sequence and learning objectives.
- Vocabulary lists, accepted translations and sampling are authored. The first check confirms review-based unlocking; see `vocabulary.md`.
- Exercise types, concise windows and automatic feedback are authored in content .4.
- All practices must be correct to finish automatically; the unit exam alone is submitted. The 90% mastery threshold and 30/50/10 coin rewards are confirmed.
- Language used for explanations and instructions.
- Any additional administrator protections would require a new instruction; exact server-side entry and separate teacher sessions are settled by Box 6.
- Additional dashboard summaries and student removal behavior; core progress measures are defined in the mastery reference.

### Completion criteria

- A student can enter, access To Be learning activities, submit answers, and see saved progress.
- A student can study each lesson's vocabulary, take its sampled translation exam, see answer feedback and the pass result, and proceed according to the resolved lesson-access rule.
- The teacher can add and remove students and inspect their progress.
- Learning data survives a new visit.
- Each teaching lesson earns 50 coins once, vocabulary mastery earns 30 once, and an exam of at least 90% grants 10 more per teaching lesson and mastery without duplicate awards. Unit 1 offers 450 coins.
- Core student and teacher tasks work on phones and laptops.
- The confirmed name-only student flow and separate administrator access are implemented and verified.

## v0.2 — Unit 2: Present Simple

Add **Present Simple** as Unit 2 in the next release. Its detailed lessons, exercises, and release timing have not been specified.

Present Simple is outside the current v0.1 content scope.

## Current phase

The Unit 1 follow-up now implements the authored five lessons, vocabulary
preparation, separate final unit exam and automatic correct/incorrect grading. See
[implementation](unit-1-implementation.md) and [validation](unit-1-validation.md).
The earlier Box 1/2/3/6 descriptions below describe their original handoffs.

Box 1 established the SvelteKit project and component verification. Boxes 2–3 implement the relational schema, backend contracts, student entry and home; see [implementation notes](boxes-2-3.md). Box 6 implements protected teacher administration; see [teacher workspace](box-6.md). Neon production is connected and migrated, with isolated learning checks and a production-connected teacher smoke check; see [Neon verification](neon-setup.md). Box 6 adds no production content. Vercel hosting and successful adapter packaging remain unverified.

## Box 6 follow-up

[Box 6](box-6.md) implements protected teacher sessions, the teacher workspace, student management, versioned attempt inspection, transactional written review and real question statistics. The owner explicitly chose exact server-configured entry through the existing name field, without another authentication step. This supersedes the earlier administrator-authorization open decision. Student automatic creation and same-name access follow the later confirmed correction. No lesson content is added by Box 6.

The second check adds compact windows, no teacher-review dependency for new lessons, custom teacher coin adjustments and navigation/read-path performance fixes; see `check-2.md`.

## v0.2 authorization — 21 October 2026

The owner now explicitly authorizes Unit 2 Present Simple, matching vocabulary,
ranking/navigation/asset improvements, performance fixes, and production deployment.
This supersedes earlier statements limiting scope to Unit 1. See
[v0.2 details](v0.2-present-simple.md)
for the five lessons, final exam, 450-coin unit budget, publication and validation.
