import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, customType, unique, index, check, foreignKey, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';
import type { CompletionPolicy, GradingRule, QuestionContent } from '../learning/contracts';

const time = (name: string) => timestamp(name, { withTimezone: true }).notNull().defaultNow();
// pg already decodes a JSONB string. Drizzle's generic JSONB decoder would parse
// JSON-looking student text a second time, changing the stored response's type.
const responseString = customType<{ data: string; driverData: string }>({
  dataType: () => 'jsonb', toDriver: value => JSON.stringify(value), fromDriver: value => value
});
export const appMetadata = pgTable('app_metadata', {
  key: text('key').primaryKey(), value: text('value').notNull(), updatedAt: time('updated_at')
});
export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(), displayName: text('display_name').notNull(),
  lookupName: text('lookup_name').notNull(), groupLabel: text('group_label'),
  status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  createdAt: time('created_at'), updatedAt: time('updated_at'), lastLearningAt: timestamp('last_learning_at', { withTimezone: true })
}, t => [uniqueIndex('students_lookup_name_unique').on(t.lookupName),
  check('student_name_length', sql`length(${t.displayName}) between 1 and 120 and length(${t.lookupName}) between 1 and 120`),
  check('student_group_length', sql`${t.groupLabel} is null or length(${t.groupLabel}) between 1 and 80`),
  check('student_status', sql`${t.status} in ('active', 'archived')`)]);
export const studentSessions = pgTable('student_sessions', {
  tokenHash: text('token_hash').primaryKey(), studentId: uuid('student_id').notNull().references(() => students.id),
  createdAt: time('created_at'), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
}, t => [index('session_student_idx').on(t.studentId), index('session_expiry_idx').on(t.expiresAt),
  check('session_lifetime', sql`${t.expiresAt} > ${t.createdAt}`), check('session_hash', sql`length(${t.tokenHash}) = 64`)]);
export const entryTickets = pgTable('entry_tickets', {
  tokenHash: text('token_hash').primaryKey(), lookupName: text('lookup_name').notNull(),
  createdAt: time('created_at'), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
}, t => [index('ticket_expiry_idx').on(t.expiresAt), check('ticket_hash', sql`length(${t.tokenHash}) = 64`)]);
export const teacherSessions = pgTable('teacher_sessions', {
  id: uuid('id').defaultRandom().primaryKey(), tokenHash: text('token_hash').notNull().unique(),
  createdAt: time('created_at'), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true })
}, t => [index('teacher_expiry_idx').on(t.expiresAt), check('teacher_hash', sql`length(${t.tokenHash}) = 64`),
  check('teacher_lifetime', sql`${t.expiresAt} > ${t.createdAt}`)]);
export const units = pgTable('units', {
  id: uuid('id').defaultRandom().primaryKey(), title: text('title').notNull(), position: integer('position').notNull(),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'), createdAt: time('created_at'), updatedAt: time('updated_at')
}, t => [unique('unit_order').on(t.position), check('unit_position', sql`${t.position} > 0`), check('unit_status', sql`${t.status} in ('draft', 'published')`)]);
export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(), unitId: uuid('unit_id').notNull().references(() => units.id),
  position: integer('position').notNull(), kind: text('kind', { enum: ['lesson', 'final_exam'] }).notNull().default('lesson'),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'), createdAt: time('created_at'), updatedAt: time('updated_at')
}, t => [unique('lesson_order').on(t.unitId, t.position), index('lesson_unit_idx').on(t.unitId),
  check('lesson_position', sql`${t.position} > 0`), check('lesson_status', sql`${t.status} in ('draft', 'published')`),
  check('lesson_kind', sql`${t.kind} in ('lesson', 'final_exam')`),
  uniqueIndex('one_final_per_unit').on(t.unitId).where(sql`${t.kind} = 'final_exam'`)]);
// Publishing freezes the revision and its children (enforced by migration triggers).
export const lessonVersions = pgTable('lesson_versions', {
  id: uuid('id').defaultRandom().primaryKey(), lessonId: uuid('lesson_id').notNull().references(() => lessons.id),
  version: integer('version').notNull(), title: text('title').notNull(), content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
  completionPolicy: jsonb('completion_policy').$type<CompletionPolicy>().notNull().default({ mode: 'manual' }),
  vocabularyRequired: boolean('vocabulary_required').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }), createdAt: time('created_at')
}, t => [unique('revision_number').on(t.lessonId, t.version), unique('revision_lesson').on(t.id, t.lessonId),
  check('revision_positive', sql`${t.version} > 0`), index('revision_lesson_idx').on(t.lessonId)]);
export const vocabularyItems = pgTable('vocabulary_items', {
  id: uuid('id').defaultRandom().primaryKey(), versionId: uuid('version_id').notNull().references(() => lessonVersions.id),
  english: text('english').notNull(), acceptedTranslations: jsonb('accepted_translations').$type<string[]>().notNull(), position: integer('position').notNull()
}, t => [unique('vocab_order').on(t.versionId, t.position), check('vocab_position', sql`${t.position} > 0`),
  check('vocab_translations', sql`jsonb_typeof(${t.acceptedTranslations}) = 'array' and jsonb_array_length(${t.acceptedTranslations}) > 0`)]);
export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(), versionId: uuid('version_id').notNull().references(() => lessonVersions.id),
  exerciseType: text('exercise_type', { enum: ['choice', 'text', 'written'] }).notNull(),
  content: jsonb('content').$type<QuestionContent>().notNull(), grading: jsonb('grading').$type<GradingRule>().notNull(),
  maxPoints: integer('max_points').notNull(), position: integer('position').notNull()
}, t => [unique('question_order').on(t.versionId, t.position), unique('question_version').on(t.id, t.versionId),
  check('question_points', sql`${t.maxPoints} > 0`), check('question_position', sql`${t.position} > 0`),
  check('question_type', sql`${t.exerciseType} in ('choice', 'text', 'written')`)]);
export const lessonAttempts = pgTable('lesson_attempts', {
  id: uuid('id').defaultRandom().primaryKey(), studentId: uuid('student_id').notNull().references(() => students.id),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id), versionId: uuid('version_id').notNull(),
  status: text('status', { enum: ['in_progress', 'submitted'] }).notNull().default('in_progress'),
  startedAt: time('started_at'), updatedAt: time('updated_at'), submittedAt: timestamp('submitted_at', { withTimezone: true }),
  earnedPoints: integer('earned_points'), maxPoints: integer('max_points'), pendingReview: boolean('pending_review').notNull().default(false)
}, t => [foreignKey({ columns: [t.versionId, t.lessonId], foreignColumns: [lessonVersions.id, lessonVersions.lessonId] }),
  unique('attempt_owner_version').on(t.id, t.studentId, t.versionId), unique('attempt_owner_lesson').on(t.id, t.studentId, t.lessonId),
  index('attempt_student_recent_idx').on(t.studentId, t.updatedAt), index('attempt_revision_idx').on(t.versionId),
  uniqueIndex('one_unfinished_attempt').on(t.studentId, t.lessonId).where(sql`${t.status} = 'in_progress'`),
  check('attempt_state', sql`(${t.status} = 'in_progress' and ${t.submittedAt} is null and ${t.earnedPoints} is null and ${t.maxPoints} is null) or (${t.status} = 'submitted' and ${t.submittedAt} is not null and ${t.earnedPoints} >= 0 and ${t.maxPoints} > 0 and ${t.earnedPoints} <= ${t.maxPoints})`)]);
export const answers = pgTable('answers', {
  attemptId: uuid('attempt_id').notNull(), studentId: uuid('student_id').notNull(), versionId: uuid('version_id').notNull(), questionId: uuid('question_id').notNull(),
  response: responseString('response').notNull(), revision: integer('revision').notNull().default(1), updatedAt: time('updated_at'),
  earnedPoints: integer('earned_points'), reviewStatus: text('review_status', { enum: ['ungraded', 'graded', 'pending'] }).notNull().default('ungraded')
}, t => [primaryKey({ columns: [t.attemptId, t.questionId] }),
  foreignKey({ columns: [t.attemptId, t.studentId, t.versionId], foreignColumns: [lessonAttempts.id, lessonAttempts.studentId, lessonAttempts.versionId] }),
  foreignKey({ columns: [t.questionId, t.versionId], foreignColumns: [questions.id, questions.versionId] }),
  index('answer_question_idx').on(t.questionId), check('answer_revision', sql`${t.revision} > 0`),
  check('answer_result', sql`(${t.reviewStatus} = 'ungraded' and ${t.earnedPoints} is null) or (${t.reviewStatus} = 'pending' and ${t.earnedPoints} is null) or (${t.reviewStatus} = 'graded' and ${t.earnedPoints} >= 0)`)]);
// Append-only assessments overlay immutable automatic answer results.
export const teacherReviews = pgTable('teacher_reviews', {
  id: uuid('id').defaultRandom().primaryKey(), requestId: uuid('request_id').notNull().unique(),
  attemptId: uuid('attempt_id').notNull(), questionId: uuid('question_id').notNull(),
  teacherSessionId: uuid('teacher_session_id').notNull().references(() => teacherSessions.id),
  revision: integer('revision').notNull(), feedback: text('feedback').notNull(),
  awardedPoints: integer('awarded_points'), createdAt: time('created_at')
}, t => [foreignKey({ columns: [t.attemptId, t.questionId], foreignColumns: [answers.attemptId, answers.questionId] }),
  unique('review_revision').on(t.attemptId, t.questionId, t.revision),
  index('review_answer_idx').on(t.attemptId, t.questionId, t.revision),
  check('review_revision_positive', sql`${t.revision} > 0`),
  check('review_points', sql`${t.awardedPoints} is null or ${t.awardedPoints} >= 0`),
  check('review_feedback_length', sql`length(${t.feedback}) <= 10000`)]);
export const studentMutations = pgTable('student_mutations', {
  requestId: uuid('request_id').primaryKey(), payloadHash: text('payload_hash').notNull(),
  studentId: uuid('student_id').notNull().references(() => students.id), createdAt: time('created_at')
});
export const lessonProgress = pgTable('lesson_progress', {
  studentId: uuid('student_id').notNull().references(() => students.id), lessonId: uuid('lesson_id').notNull().references(() => lessons.id),
  completedAttemptId: uuid('completed_attempt_id').notNull(), completedAt: time('completed_at')
}, t => [primaryKey({ columns: [t.studentId, t.lessonId] }),
  foreignKey({ columns: [t.completedAttemptId, t.studentId, t.lessonId], foreignColumns: [lessonAttempts.id, lessonAttempts.studentId, lessonAttempts.lessonId] }),
  index('progress_attempt_idx').on(t.completedAttemptId)]);
export const vocabularyResults = pgTable('vocabulary_results', {
  id: uuid('id').defaultRandom().primaryKey(), studentId: uuid('student_id').notNull().references(() => students.id),
  lessonId: uuid('lesson_id').notNull(), versionId: uuid('version_id').notNull(),
  sourceKey: text('source_key').notNull(), correct: integer('correct').notNull(), total: integer('total').notNull(), createdAt: time('created_at')
}, t => [foreignKey({ columns: [t.versionId, t.lessonId], foreignColumns: [lessonVersions.id, lessonVersions.lessonId] }),
  unique('vocab_result_source').on(t.studentId, t.sourceKey), unique('vocab_result_owner').on(t.id, t.studentId, t.lessonId, t.versionId),
  check('vocab_score', sql`${t.total} > 0 and ${t.correct} >= 0 and ${t.correct} <= ${t.total}`)]);
export const vocabularyReadiness = pgTable('vocabulary_readiness', {
  studentId: uuid('student_id').notNull(), lessonId: uuid('lesson_id').notNull(), versionId: uuid('version_id').notNull(),
  resultId: uuid('result_id').notNull(), passedAt: time('passed_at')
}, t => [primaryKey({ columns: [t.studentId, t.lessonId, t.versionId] }),
  foreignKey({ columns: [t.resultId, t.studentId, t.lessonId, t.versionId], foreignColumns: [vocabularyResults.id, vocabularyResults.studentId, vocabularyResults.lessonId, vocabularyResults.versionId] })]);

// Unit 1 workspaces are separate from immutable submissions. No answers or
// attempt history are replaced by a navigation, audio or practice-check event.
export const studyWorkspaces = pgTable('study_workspaces', {
  attemptId: uuid('attempt_id').primaryKey().references(() => lessonAttempts.id),
  sectionId: text('section_id').notNull().default(''), panels: jsonb('panels').$type<Record<string,string>>().notNull().default({}),
  revision: integer('revision').notNull().default(0), audioPlays: integer('audio_plays').notNull().default(0),
  audioStatus: text('audio_status', {enum:['idle','completed','failed']}).notNull().default('idle'),
  transcriptUsed: boolean('transcript_used').notNull().default(false), updatedAt: time('updated_at')
},t=>[check('workspace_counts',sql`${t.revision} >= 0 AND ${t.audioPlays} >= 0`)]);
export const practiceChecks = pgTable('practice_checks', {
  id: uuid('id').primaryKey(), attemptId: uuid('attempt_id').notNull(), studentId:uuid('student_id').notNull(), versionId:uuid('version_id').notNull(), questionId:uuid('question_id').notNull(),
  answerRevision: integer('answer_revision').notNull(), response: text('response').notNull(), earnedPoints: integer('earned_points'), reviewStatus:text('review_status').notNull(),
  transcriptUsed: boolean('transcript_used').notNull().default(false), createdAt: time('created_at')
},t=>[foreignKey({columns:[t.attemptId,t.studentId,t.versionId],foreignColumns:[lessonAttempts.id,lessonAttempts.studentId,lessonAttempts.versionId]}),
  foreignKey({columns:[t.questionId,t.versionId],foreignColumns:[questions.id,questions.versionId]}),unique('check_answer_revision').on(t.attemptId,t.questionId,t.answerRevision)]);
export const studyEvents = pgTable('study_events', {
  id:uuid('id').primaryKey(), attemptId:uuid('attempt_id').notNull().references(()=>lessonAttempts.id), kind:text('kind').notNull(),
  result:jsonb('result').$type<Record<string,unknown>>().notNull(), createdAt:time('created_at')
},t=>[index('study_event_attempt').on(t.attemptId)]);
export const vocabularySessions = pgTable('vocabulary_sessions', {
  id:uuid('id').defaultRandom().primaryKey(), studentId:uuid('student_id').notNull().references(()=>students.id),lessonId:uuid('lesson_id').notNull(),versionId:uuid('version_id').notNull(),
  wordIds:jsonb('word_ids').$type<string[]>().notNull(), responses:jsonb('responses').$type<{id:string;response:string;correct:boolean}[]>().notNull().default([]),
  submitted:boolean('submitted').notNull().default(false),createdAt:time('created_at'),updatedAt:time('updated_at')
},t=>[foreignKey({columns:[t.versionId,t.lessonId],foreignColumns:[lessonVersions.id,lessonVersions.lessonId]}),
  uniqueIndex('one_vocab_session').on(t.studentId,t.versionId).where(sql`${t.submitted}=false`)]);

// Reading unlocks a revision; passing its test is a separate mastery milestone.
export const vocabularyStudy = pgTable('vocabulary_study', {
  studentId: uuid('student_id').notNull().references(() => students.id),
  lessonId: uuid('lesson_id').notNull(), versionId: uuid('version_id').notNull(), reviewedAt: time('reviewed_at')
}, t => [primaryKey({ columns: [t.studentId, t.lessonId, t.versionId] }),
  foreignKey({ columns: [t.versionId, t.lessonId], foreignColumns: [lessonVersions.id, lessonVersions.lessonId] })]);

// The stable lesson identity prevents repeat rewards, including new revisions.
export const learningRewards = pgTable('learning_rewards', {
  studentId: uuid('student_id').notNull().references(() => students.id),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id),
  kind: text('kind', { enum: ['vocabulary', 'lesson', 'mastery'] }).notNull(),
  coins: integer('coins').notNull(), awardedAt: time('awarded_at')
}, t => [primaryKey({ columns: [t.studentId, t.lessonId, t.kind] }),
  check('reward_amount', sql`(${t.kind} = 'vocabulary' AND ${t.coins} = 30) OR (${t.kind} = 'lesson' AND ${t.coins} = 50) OR (${t.kind} = 'mastery' AND ${t.coins} = 10)`)]);
