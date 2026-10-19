import type { GradingRule } from './contracts';
import { apostrophes } from '../validation';
export type AuthoredRule = Extract<GradingRule, { mode: 'authored' }>;
export function responseParts(response: string | undefined): Record<string, unknown> {
  if (!response) return {};
  try { const v = JSON.parse(response); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; }
}
export function answered(response: string | undefined, ids?: string[]) {
  if (!ids) return !!response?.trim();
  const values = responseParts(response);
  return ids.every(id => typeof values[id] === 'string' ? !!(values[id] as string).trim() : Array.isArray(values[id]) && (values[id] as unknown[]).length > 0);
}
export function normalizeAuthored(s: string) {
  return apostrophes(s.normalize('NFKC')).toLowerCase().replace(/[.,!?;:]/g, ' ').replace(/\s+/g, ' ').trim();
}
function expand(s: string) {
  return s.replace(/\bi'm\b/g, 'i am').replace(/\b(he|she|it|where|who|what|how)'s\b/g, '$1 is')
    .replace(/\b(you|we|they)'re\b/g, '$1 are').replace(/\bisn't\b/g, 'is not').replace(/\baren't\b/g, 'are not');
}
function matches(a: string, b: string, strict: boolean) {
  const x = normalizeAuthored(a), y = normalizeAuthored(b);
  // Positive short answers cannot end in a contraction, even though expansion
  // is allowed in ordinary statements. Full/short-form tasks remain strict.
  if (/^yes\b/.test(y) && /\b(?:i'm|\w+'s|\w+'re)$/.test(x)) return false;
  return x === y || (!strict && expand(x) === expand(y));
}
export function authoredGrade(rule: AuthoredRule, response: string | undefined, maxPoints: number) {
  const obj = responseParts(response);
  const values = rule.partIds.map(id => obj[id]);
  if (!values.some(v => typeof v === 'string' ? v.trim() : Array.isArray(v) && v.length)) return { earnedPoints: 0, reviewStatus: 'graded' as const };
  if (rule.kind === 'multi') {
    const selected = values[0];
    const good = Array.isArray(selected) && selected.every(x => typeof x === 'string') && new Set(selected).size === selected.length && selected.length === rule.accepted.length && selected.every(x => rule.accepted.includes(x));
    return { earnedPoints: good ? maxPoints : 0, reviewStatus: 'graded' as const };
  }
  const allCorrect = values.every((v,i) => typeof v === 'string' && (Array.isArray(rule.accepted[0]) ? rule.accepted[i] as string[] : rule.accepted as string[]).some(a => matches(v, a, rule.strict)));
  if (allCorrect) return { earnedPoints: maxPoints, reviewStatus: 'graded' as const };
  if (rule.rubric) {
    const text = normalizeAuthored(String(values[0] ?? '')), e = expand(text);
    // Credit only the authored semantic criterion; unrecognised paraphrases
    // remain pending so a teacher can apply the same two-point rubric.
    const meaning = rule.rubric === 17 ? /\bi\b/.test(e) && /\bnot\b/.test(e) && /\btired\b/.test(e)
      : rule.rubric === 18 ? /\bphone\b/.test(e) && /\bon\b/.test(e) && /\bdesk\b/.test(e)
      : rule.rubric === 19 ? /\byou\b/.test(e) && /\bwhere\b/.test(e) && /\bfrom\b/.test(e)
      : /\byes\b/.test(e) && /\bwe\b/.test(e);
    if (meaning) return { earnedPoints: 1, reviewStatus: 'graded' as const };
    return { earnedPoints: null, reviewStatus: 'pending' as const };
  }
  if (rule.kind === 'choice' || rule.kind === 'order' || (rule.accepted as string[]).every(a => typeof a === 'string' && !a.includes(' '))) return { earnedPoints: 0, reviewStatus: 'graded' as const };
  const text = normalizeAuthored(values.filter(v => typeof v === 'string').join(' '));
  const definiteError = /\b(?:i amn't|he are|she are|it are|we is|they is|you is|he am|she am|a tired|a busy|a students|a app|busys|not is)\b/.test(text) || /^yes\b.*\b(?:i'm|\w+'s|\w+'re)$/.test(text);
  return definiteError ? { earnedPoints: 0, reviewStatus: 'graded' as const } : { earnedPoints: null, reviewStatus: 'pending' as const };
}
