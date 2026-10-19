# Vocabulary before each lesson

## Purpose and naming

Each unit includes vocabulary sets linked to its individual lessons. Students learn the vocabulary before opening the corresponding lesson.

Use the unit and lesson numbers to identify each set:

| Vocabulary set | Associated lesson |
| --- | --- |
| Vocab 1.1 | Unit 1, Lesson 1 |
| Vocab 1.2 | Unit 1, Lesson 2 |
| Vocab 1.3 | Unit 1, Lesson 3 |

Continue the same naming pattern for the remaining lessons and future units. Unit 1: To Be and its vocabulary belong to v0.1; Unit 2: Present Simple remains v0.2.

## Confirmed student flow

1. Open the vocabulary set for the upcoming lesson, such as **Vocab 1.1**.
2. View the vocabulary and learn it by heart.
3. Select **Take an exam**.
4. Complete a flashcard-style vocabulary exam: see an English word and type its translation into **Uzbek**.
5. After submitting each answer, see whether it is correct.
6. Receive an overall exam result. A score of **at least 75%** passes that vocabulary level.
7. Proceed to the corresponding lesson after the vocabulary step.

The exam tests **one-third of the words in that vocabulary set**. It does not test one-third of all words across the unit.

This is a typed-answer flashcard exam, not a self-rated card flip or a multiple-choice quiz.

## Lesson access

**Working interpretation:** passing the matching vocabulary exam at 75% or above unlocks its lesson. Viewing the vocabulary list alone does not unlock it.

For example, passing Vocab 1.1 opens Lesson 1.1; passing Vocab 1.2 opens Lesson 1.2. Do not assume that passing one set unlocks every lesson in the unit.

The user specified vocabulary before lessons and a 75% vocabulary pass threshold. The exact unlocking behavior above makes that sequence concrete and remains an implementation assumption until confirmed.

## Vocabulary study view

Show each English word with its Uzbek translation so the student can study before taking the exam. The exact word lists and accepted translations still need to be supplied or authored.

Keep the study list and typed-answer cards readable on both phones and laptops. On phones, the answer field and submit control must remain usable with the on-screen keyboard open.

## Exam sampling and scoring

### Confirmed rules

- Ask one-third of the set's words.
- Present one English word at a time and accept a typed Uzbek translation.
- Give correct/incorrect feedback after each submitted answer.
- Pass at **75% or above**, including exactly 75%.

### Proposed implementation defaults

The following details resolve gaps in the requirements; they are not additional user-confirmed rules:

- Randomly select distinct words for each attempt, with no repeated word within an attempt.
- When the word count is not divisible by three, round the sample size **up**: `question_count = ceil(total_words / 3)`.
- Require a nonempty vocabulary set before enabling its exam.
- Give each sampled word equal weight, with one scored submission per card.
- Calculate `exam_percent = 100 × correct_answers / question_count` and pass when `exam_percent >= 75`.
- Decide passing from the unrounded result, not a rounded display percentage.
- Show the expected translation after an incorrect answer to support learning.

Examples under these defaults:

| Words in set | Questions asked | Minimum correct answers to pass |
| --- | --- | --- |
| 12 | 4 | 3 — exactly 75% |
| 15 | 5 | 4 — 80% |
| 20 | 7 | 6 — approximately 85.7% |

For small samples, the lowest achievable passing score may be higher than 75% because answers are counted in whole numbers.

## Relationship to unit mastery and points

Vocabulary passing and unit mastery are different milestones:

| Assessment | Passing threshold | Result |
| --- | --- | --- |
| Vocabulary exam before a lesson | At least 75% | Vocabulary level passed; matching lesson unlocks under the working interpretation. |
| Final exam at the end of a unit | At least 90% | Unit mastery and the final 50 unit points. |

Passing vocabulary does not itself mark the associated lesson Finished or grant full unit mastery. The existing unit budget remains **50 points from finished lessons + 50 points from the qualifying final exam**. No separate vocabulary point award has been specified; do not add extra points without a new decision.

See [Levels and mastery](levels-and-mastery.md) for unit scoring.

## Progress records

Save vocabulary attempts and pass results so the vocabulary step can be resumed across visits and devices once student identity is resolved. Associate each result with the student and the correct unit/lesson vocabulary set.

The teacher should be able to inspect vocabulary results as part of student progress. Keep vocabulary scores separately labeled from lesson completion, unit points, and final exam scores.

## Remaining decisions

- Confirm that passing the vocabulary exam is required to unlock the corresponding lesson.
- Confirm random sampling and rounding up when the word count is not divisible by three.
- Exact English word lists, Uzbek translations, and accepted alternative translations.
- Answer normalization: capitalization, surrounding spaces, Uzbek apostrophe variants, and whether to accept Cyrillic alongside Latin Uzbek.
- Whether spelling mistakes receive any tolerance or partial credit.
- Retry limits, waiting periods, and behavior of later failed attempts after a set has already been passed.
- Whether vocabulary contributes points within the existing 50-point lesson allocation; no additional point pool is currently defined.
