# Vocabulary before each lesson

The owner's first check on 19 October 2026 replaces test-required unlocking.
Vocabulary review and vocabulary mastery are now separate milestones.

## Student flow

1. Choose a teaching lesson and read its matching list (Vocab 1.1, Vocab 1.2, etc.).
2. **Ko‘rib chiqdim** saves review and opens that lesson, without giving coins.
3. **Test topshirish** starts or resumes the typed English-to-Uzbek test.
4. At **75% or above**, the vocabulary becomes mastered and awards **30 coins once**.

Students can open the lesson after reviewing, then return to master vocabulary
later using its vocabulary preparation link. Passing the test also satisfies
review readiness. A failed test never removes existing review or a past pass.
The current revision must be reviewed or passed; another student's review or
another lesson's review cannot unlock it. Passed historical revisions retain
their original results and rewards. New revisions do not pay another 30 coins.

Vocabulary preparation offers the two actions above. Once unlocked, the first
button becomes **Darsni ochish**. A separate quick-reference vocabulary dialog
remains available during practice. The preparation route is
`/learn/:lessonId?vocab`; it remains accessible after an attempt has started.
Unit 1 exam 1.6 has no vocabulary reward or vocabulary gate; its list is review.

## Test format and scoring

- Sample `ceil(total_words / 3)` distinct random words from that lesson's set.
- Show an English word and require a typed Uzbek translation.
- Save one scored submission per card and provide immediate answer feedback.
- Pass from the unrounded result: `100 × correct >= 75 × sample_size`.
- Show expected translations after an incorrect answer.
- Permit unlimited attempts; retain a passing result after later failures.
- Normalize case, whitespace, punctuation and Uzbek apostrophe variants, using
  the existing accepted translations. Do not add AI checking or spelling tolerance.
- Resume unfinished sessions with saved answers across visits/devices.

Vocabulary lists and translations remain the authored ZIP's content. Headers
are not words. The one-third vocabulary sample is separate from the 90% final
exam mastery rule. Passing vocabulary does not finish the lesson.

## Persistence and rewards

`vocabulary_study` stores revision-specific **Ko‘rib chiqdim** confirmations.
`vocabulary_results` and `vocabulary_readiness` continue storing test results
and genuine passes; review never fabricates a passing test. The immutable coin
ledger awards 30 once per student and stable lesson ID. All changes are
session-owned and transactional. Teacher details retain actual vocabulary test
results and show the student's real coin totals.

See [Progress, coins and mastery](levels-and-mastery.md) for scoring and ranking.
