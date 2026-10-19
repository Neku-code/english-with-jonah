import test from 'node:test';
import assert from 'node:assert/strict';
import { grade, isCompleted, validateQuestion } from '../src/lib/server/learning/grading';

test('explicit objective rules: option IDs, exact normalization, case and manual review', () => {
  assert.equal(grade({ mode: 'choice', correctOptionId: 'a' }, 'a', 3).earnedPoints, 3);
  assert.equal(grade({ mode: 'choice', correctOptionId: 'a' }, 'label for a', 3).earnedPoints, 0);
  assert.equal(grade({ mode: 'exact', accepted: ["o'zbek"], caseSensitive: false, normalizeApostrophes: true }, ' OʻZBEK ', 2).earnedPoints, 2);
  assert.equal(grade({ mode: 'exact', accepted: ['TOKEN'], caseSensitive: true, normalizeApostrophes: false }, 'token', 2).earnedPoints, 0);
  assert.equal(grade({ mode: 'manual' }, 'Written response', 4).reviewStatus, 'pending');
  assert.equal(grade({ mode: 'manual' }, '', 4).earnedPoints, 0);
  assert.throws(() => validateQuestion({ exerciseType: 'written', grading: { mode: 'exact', accepted: ['x'], caseSensitive: true, normalizeApostrophes: false }, content: { prompt: 'Synthetic' }, maxPoints: 1 }));
});
test('configured thresholds use unrounded values and pending review never completes', () => {
  const policy = { mode: 'score' as const, minimumPercent: 90 };
  assert.equal(isCompleted(policy, 899, 1000, false, true), false);
  assert.equal(isCompleted(policy, 900, 1000, false, true), true);
  assert.equal(isCompleted(policy, 900, 1000, true, true), false);
  assert.equal(isCompleted({ mode: 'manual' }, 1000, 1000, false, true), false);
  assert.equal(isCompleted({ mode: 'all_answered' }, 1, 1000, false, true), true);
  assert.equal(isCompleted({ mode: 'all_answered' }, 1, 1000, false, false), false);
});
