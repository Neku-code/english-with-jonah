# Progress, coins and mastery

The owner's first check on 19 October 2026 replaces the previous 50/50 unit
points budget. Coins are the ranking points; exercise marks remain separate.

## Rewards

| Milestone | Award | Status |
| --- | --- | --- |
| Select **Ko‘rib chiqdim** after studying the vocabulary | 0 | Matching lesson unlocked |
| Pass its typed vocabulary test at **75% or above** | **30 coins** | Vocabulary mastered |
| Complete one teaching lesson | **50 coins** | Lesson finished |
| Pass the unit final exam at **90% or above**, with all teaching lessons finished | **10 more coins per teaching lesson** | Teaching lessons and unit mastered |

Unit 1 has five teaching lessons (1.1–1.5) and a separate final exam (1.6).
The exam is the sixth entry, not an additional teaching lesson with another
50-coin reward. Its mastery bonus is 5 × 10 = **50 coins**. Each teaching
lesson can earn 30 vocabulary + 50 completion + 10 mastery = **90 coins**;
Unit 1 offers **450 coins**. Its final exam vocabulary is review only.

Finishing lessons still requires their authored parts answered and checked,
completed listening, and any required teacher reviews resolved. Existing
revision-specific completion policies and the final exam threshold remain.
Pending or failed attempts earn no new completion/mastery reward. The exam
opens after all five teaching lessons are finished. Teaching lessons can be
chosen independently after reviewing their own vocabulary.

## Exactly-once rewards

`learning_rewards` is an append-only PostgreSQL ledger with a primary key on
student, stable lesson ID and reward kind. Neither practice questions, repeated
submissions, retries, refreshes, concurrent requests nor republished revisions
create another receipt for the same milestone. The server derives awards from
saved results, never a client-supplied balance. Submission, teacher review,
progress and coins commit in one transaction under the student's existing lock.

Failed later attempts do not remove earned coins or earlier successful results.
A teacher's amendment can change the effective completion/mastery status;
previously earned coin receipts remain, so qualifying again never pays twice.
Migration 0009 backfills real historical passes/completions exactly once.

## Rankings

`/ranking` is available only to signed-in students. It ranks active students by
all their saved coins, highest first. Equal totals share the same dense rank;
alphabetical ordering stabilizes ties. New students appear with zero. Archived
students are hidden, and reactivated students retain their original coins.
Only display names, totals, ranks and the current-row flag are returned. No
student IDs, groups, profile links, answers or grading keys are exposed.

Home, lesson navigation and teacher student details show real coin totals.
Exercise scores remain labeled **ball**; reward balances are labeled **coin**.
No extra numbered level or CEFR rank is introduced.
