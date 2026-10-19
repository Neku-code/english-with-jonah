// Grading keys stay server-side. Student DTOs use explicit allowlists.
export type CompletionPolicy = { mode: 'manual' } | { mode: 'all_answered' } | { mode: 'practice' } | { mode: 'score'; minimumPercent: number };
export type GradingRule =
  | { mode: 'choice'; correctOptionId: string }
  | { mode: 'exact'; accepted: string[]; caseSensitive: boolean; normalizeApostrophes: boolean }
  | { mode: 'manual'; feedback?: string; partIds?: string[]; listening?: boolean }
  | { mode: 'authored'; accepted: (string | string[])[]; kind: string; partIds: string[]; feedback: string; notes: string; rubric: number | null; listening: boolean; strict: boolean; binary?: boolean };
export type QuestionContent = { prompt: string; task?: import('../../learning/types').Task; options?: { id: string; label: string }[]; media?: { kind: 'image' | 'audio' | 'video'; url: string; alt?: string }[] };
export type StudentIdentity = { id: string; displayName: string; groupLabel: string | null };
export type AttemptResult = { id: string; status: 'in_progress' | 'submitted'; earnedPoints: number | null; maxPoints: number | null; pendingReview: boolean };
