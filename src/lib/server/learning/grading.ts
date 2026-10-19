import type { CompletionPolicy, GradingRule, QuestionContent } from './contracts';
import { apostrophes, reject } from '../validation';
import { authoredGrade, answered,responseParts } from './authored-grading';

export function validatePolicy(policy: CompletionPolicy) {
  if (!policy || !['manual', 'all_answered', 'score'].includes(policy.mode) ||
    (policy.mode === 'score' && (!Number.isFinite(policy.minimumPercent) || policy.minimumPercent < 0 || policy.minimumPercent > 100))) {
    reject(409, 'INVALID_CONTENT', 'Dars sozlamalarini o‘qituvchi tekshirishi kerak.');
  }
}
export function validateQuestion(q: { exerciseType: string; grading: GradingRule; content: QuestionContent; maxPoints: number }) {
  const g = q.grading;
  const valid = q.content && typeof q.content.prompt === 'string' && q.content.prompt.trim() && Number.isSafeInteger(q.maxPoints) && q.maxPoints > 0 && g && (
    (g.mode === 'authored' && q.content.task && g.partIds.length === q.content.task.parts.length && g.accepted.length > 0) ||
    (q.exerciseType === 'written' && g.mode === 'manual') ||
    (q.exerciseType === 'text' && (g.mode === 'manual' || (g.mode === 'exact' && Array.isArray(g.accepted) && g.accepted.length > 0 && g.accepted.every(a => typeof a === 'string' && a.length > 0) && typeof g.caseSensitive === 'boolean' && typeof g.normalizeApostrophes === 'boolean'))) ||
    (q.exerciseType === 'choice' && g.mode === 'choice' && Array.isArray(q.content.options) && q.content.options.length > 1 &&
      q.content.options.every(o => typeof o.id === 'string' && o.id && typeof o.label === 'string') &&
      new Set(q.content.options.map(o => o.id)).size === q.content.options.length && q.content.options.some(o => o.id === g.correctOptionId)));
  if (!valid) reject(409, 'INVALID_CONTENT', 'Dars sozlamalarini o‘qituvchi tekshirishi kerak.');
}
export function grade(rule: GradingRule, response: string | undefined, maxPoints: number) {
  if (rule.mode === 'authored') return authoredGrade(rule, response, maxPoints);
  if (rule.mode === 'manual' && rule.partIds && !answered(response, rule.partIds)) {
    const hasAny = response && Object.values(responseParts(response)).some(v => typeof v === 'string' && v.trim());
    return hasAny ? { earnedPoints: null, reviewStatus: 'pending' as const } : { earnedPoints: 0, reviewStatus: 'graded' as const };
  }
  // Missing answers are objectively zero; authored written responses need review.
  if (response === undefined || !response.trim()) return { earnedPoints: 0, reviewStatus: 'graded' as const };
  if (rule.mode === 'manual') return { earnedPoints: null, reviewStatus: 'pending' as const };
  if (rule.mode === 'choice') return { earnedPoints: response === rule.correctOptionId ? maxPoints : 0, reviewStatus: 'graded' as const };
  const normalize = (s: string) => {
    let v = s.normalize('NFC').trim().replace(/\s+/gu, ' ');
    if (rule.normalizeApostrophes) v = apostrophes(v);
    return rule.caseSensitive ? v : v.toLocaleLowerCase('uz-Latn');
  };
  return { earnedPoints: rule.accepted.some(a => normalize(a) === normalize(response)) ? maxPoints : 0, reviewStatus: 'graded' as const };
}
export function isCompleted(policy: CompletionPolicy, earned: number, maximum: number, pending: boolean, allAnswered: boolean) {
  validatePolicy(policy);
  if (pending || !maximum) return false;
  if (policy.mode === 'manual') return false;
  if (policy.mode === 'all_answered') return allAnswered;
  return 100 * earned >= policy.minimumPercent * maximum;
}
