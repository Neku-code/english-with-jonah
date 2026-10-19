# Version roadmap

## v0.1 — Unit 1: To Be

This is the current implementation target.

### Required scope

- English learning content focused on **To Be** for complete beginners.
- Vocabulary before each lesson, numbered by unit and lesson, with typed English-to-Uzbek flashcard exams on one-third of each set's words, feedback after each answer, and a 75% pass threshold. See [Vocabulary](vocabulary.md) for lesson unlocking and sampling assumptions.
- Name-based student entry and self-starting student access, as described in the project brief.
- Student accounts/profiles and persisted learning data.
- Student answers, grading, scores, and progress.
- Approximately 5–7 lessons and a final exam per unit, with Finished lesson statuses, 50 lesson points total, and 50 additional points plus mastery for a final exam score of at least 90%. See [Levels and mastery](levels-and-mastery.md).
- Administrator entry using the requested name `Jonah2009tdiu`, with real-data authorization details to be resolved before launch.
- Teacher abilities to add and remove students, monitor students, and view their progress.
- Responsive student and teacher experiences for phones and laptops.
- The confirmed stack and Clay & Sage palette.

### Details still to define

- To Be lesson sequence and learning objectives.
- Vocabulary lists, accepted Uzbek answers, sampling details, retry rules, and confirmation of the vocabulary-based lesson unlock.
- Exercise types, questions, and feedback.
- Detailed exercise grading, lesson completion criteria, and exam retry rules. The 90% mastery threshold and 50/50 point split are already confirmed.
- Language used for explanations and instructions.
- Returning-student identity, session behavior, and administrator protection.
- Additional dashboard summaries and student removal behavior; core progress measures are defined in the mastery reference.

### Completion criteria

- A student can enter, access To Be learning activities, submit answers, and see saved progress.
- A student can study each lesson's vocabulary, take its sampled translation exam, see answer feedback and the pass result, and proceed according to the resolved lesson-access rule.
- The teacher can add and remove students and inspect their progress.
- Learning data survives a new visit.
- All finished lessons together earn exactly 50 points; an exam below 90% preserves progress, and an exam of at least 90% grants the remaining 50 points and mastery without duplicate awards.
- Core student and teacher tasks work on phones and laptops.
- Identity and administrator access decisions are implemented and verified before real student data is used.

## v0.2 — Unit 2: Present Simple

Add **Present Simple** as Unit 2 in the next release. Its detailed lessons, exercises, and release timing have not been specified.

Present Simple is outside the current v0.1 content scope.

## Current phase

The documentation-first phase is complete. Box 1 establishes the SvelteKit project, plain component verification, database connection scaffolding, repository integration, and deployment configuration. The user will supply the application design later; application screen design has not begun. Live database/hosting verification remains dependent on account connection. See [Box 1 setup](box-1-setup.md) for current status. Student identity, learning flows, and administration are later boxes.
