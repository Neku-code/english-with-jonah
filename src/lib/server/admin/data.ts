import { sql, eq, and, desc, ne } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Connection, Database } from '../db/connect';
import { students, lessonAttempts, lessonProgress, lessonVersions, lessons, teacherReviews, studentMutations, coinAdjustments } from '../db/schema';
import { displayName, normalizeName, reject, uuid } from '../validation';
import { createStudent, renameStudent, archiveStudent, reactivateStudent } from '../students';
import { hashToken } from '../sessions';
import { lockTeacherSession } from '../teacher-sessions';
import { homeData } from '../learning/catalog';

export const PAGE_SIZE = 20;
export function pageNumber(url: URL) {
  const n = Number(url.searchParams.get('page') ?? 1);
  return Number.isSafeInteger(n) && n > 0 && n <= 100_000 ? n : 1;
}
const filterId = (value: string | null) => value ? uuid(value) : null;
export function filters(url: URL) { return { lesson: filterId(url.searchParams.get('lesson')), student: filterId(url.searchParams.get('student')), page: pageNumber(url) }; }
export async function overview(db: Connection) {
  const { rows } = await db.execute<{ active: number; started: number; submitted: number; pending: number; lessons: number }>(sql`
    SELECT (SELECT count(*)::int FROM students WHERE status = 'active') AS active,
    (SELECT count(*)::int FROM students s WHERE EXISTS (SELECT 1 FROM lesson_attempts a WHERE a.student_id=s.id) OR EXISTS (SELECT 1 FROM vocabulary_results v WHERE v.student_id=s.id)) AS started,
    (SELECT count(*)::int FROM lesson_attempts WHERE status='submitted') AS submitted,
    (SELECT count(*)::int FROM effective_answers e JOIN lesson_attempts a ON a.id=e.attempt_id WHERE a.status='submitted' AND e.effective_status='pending') AS pending,
    (SELECT count(*)::int FROM lessons) AS lessons`);
  return rows[0];
}
export async function listStudents(db: Connection, url: URL) {
  const search = (url.searchParams.get('q') ?? '').slice(0, 120);
  const status = url.searchParams.get('status') === 'archived' ? 'archived' : url.searchParams.get('status') === 'all' ? 'all' : 'active';
  const page = pageNumber(url);
  const pattern = `%${normalizeName(search).replace(/[\\%_]/g, '\\$&')}%`;
  const condition = and(status === 'all' ? undefined : eq(students.status, status), sql`${students.lookupName} LIKE ${pattern}`);
  const rows = await db.select().from(students).where(condition).orderBy(students.lookupName, students.id).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
  const { rows: totals } = await db.execute<{ total: number }>(sql`SELECT count(*)::int AS total FROM students WHERE ${condition}`);
  return { students: rows, total: totals[0].total, page, search, status, requestId: randomUUID() };
}
async function duplicateCheck(db: Connection, name: unknown, except?: string) {
  const lookup = normalizeName(displayName(name));
  const matches = await db.select({ id: students.id }).from(students).where(and(eq(students.lookupName, lookup), except ? ne(students.id, except) : undefined)).limit(1);
  if (matches.length) reject(409, 'DUPLICATE_NAME', 'Bu ism bilan profil mavjud (nofaol profillar ham hisoblanadi). Alohida profil uchun boshqa ism kiriting.');
}
export async function addManagedStudent(db: Database, teacherId: string, form: FormData) {
  const requestId = uuid(form.get('requestId'));
  const name = displayName(form.get('name'));
  const group = form.get('group');
  const payloadHash = hashToken(JSON.stringify([name, group]));
  return db.transaction(async tx => {
    await lockTeacherSession(tx, teacherId);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${requestId}, 0))`);
    const [receipt] = await tx.select().from(studentMutations).where(eq(studentMutations.requestId, requestId));
    if (receipt) {
      if (receipt.payloadHash !== payloadHash) reject(409, 'REQUEST_CONFLICT', 'Bu so‘rov oldin boshqa ma’lumot bilan saqlangan. Sahifani yangilang.');
      return receipt.studentId;
    }
    await duplicateCheck(tx, name);
    const student = await createStudent(tx, name, group);
    await tx.insert(studentMutations).values({ requestId, payloadHash, studentId: student.id });
    return student.id;
  });
}
export async function manageStudent(db: Database, teacherId: string, id: string, operation: string, form: FormData) {
  // Lock and recheck session before delegating to the existing lifecycle services.
  // Session revocation serializes against this transaction and cannot race a mutation.
  return db.transaction(async tx => {
    await lockTeacherSession(tx, teacherId);
    const [student] = await tx.select().from(students).where(eq(students.id, uuid(id))).for('update');
    if (!student) reject(404, 'STUDENT_NOT_FOUND', 'O‘quvchi topilmadi.');
    if (operation === 'rename') {
      await duplicateCheck(tx, form.get('name'), id);
      await renameStudent(tx as Database, id, form.get('name'), form.get('group'));
    } else if (operation === 'archive') await archiveStudent(tx as Database, id);
    else if (operation === 'reactivate') await reactivateStudent(tx as Database, id);
    else reject(400, 'INVALID_ACTION', 'Amal noto‘g‘ri.');
  });
}
export async function studentDetail(db: Connection, id: string, url: URL) {
  const [student] = await db.select().from(students).where(eq(students.id, uuid(id)));
  if (!student) reject(404, 'STUDENT_NOT_FOUND', 'O‘quvchi topilmadi.');
  const page = pageNumber(url);
  const attempts = await db.select({ attempt: lessonAttempts, title: lessonVersions.title, version: lessonVersions.version, kind: lessons.kind })
    .from(lessonAttempts).leftJoin(lessonVersions, eq(lessonVersions.id, lessonAttempts.versionId)).leftJoin(lessons, eq(lessons.id, lessonAttempts.lessonId))
    .where(eq(lessonAttempts.studentId, id)).orderBy(desc(lessonAttempts.startedAt), desc(lessonAttempts.id)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
  const { rows: counts } = await db.execute<{ total: number; submitted: number; underway: number; finished: number }>(sql`
    SELECT count(*)::int total, count(*) FILTER (WHERE status='submitted')::int submitted, count(DISTINCT lesson_id) FILTER (WHERE status='in_progress')::int underway,
    (SELECT count(*)::int FROM lesson_progress WHERE student_id=${id}) finished FROM lesson_attempts WHERE student_id=${id}`);
  const { rows: completed } = await db.execute<{ lessonId: string; title: string | null; completedAt: Date }>(sql`
    SELECT p.lesson_id AS "lessonId", v.title, p.completed_at AS "completedAt" FROM lesson_progress p JOIN lesson_attempts a ON a.id=p.completed_attempt_id
    LEFT JOIN lesson_versions v ON v.id=a.version_id WHERE p.student_id=${id} ORDER BY p.completed_at DESC`);
  const { rows: vocab } = await db.execute<{ id: string; correct: number; total: number; createdAt: Date; title: string | null; version: number | null }>(sql`
    SELECT r.id,r.correct,r.total,r.created_at AS "createdAt",v.title,v.version FROM vocabulary_results r LEFT JOIN lesson_versions v ON v.id=r.version_id
    WHERE r.student_id=${id} ORDER BY r.created_at DESC,r.id LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`);
  const { rows: vocabCount } = await db.execute<{ total: number }>(sql`SELECT count(*)::int total FROM vocabulary_results WHERE student_id=${id}`);
  const { rows: lessonStates } = await db.execute<{ lessonId: string; submitted: boolean }>(sql`SELECT lesson_id AS "lessonId",bool_or(status='submitted') submitted FROM lesson_attempts WHERE student_id=${id} GROUP BY lesson_id`);
  const adjustments = await db.select().from(coinAdjustments).where(eq(coinAdjustments.studentId, id)).orderBy(desc(coinAdjustments.createdAt)).limit(20);
  return { student, attempts, completed, vocab, lessonStates, adjustments, coinRequestId: randomUUID(), vocabTotal: vocabCount[0].total, page, ...counts[0], home: await homeData(db, id) };
}
export async function filterOptions(db: Connection) {
  const { rows: lessonOptions } = await db.execute<{ id: string; title: string }>(sql`
    SELECT DISTINCT ON (l.id) l.id, v.title FROM lessons l JOIN lesson_versions v ON v.lesson_id=l.id WHERE v.published_at IS NOT NULL ORDER BY l.id,v.version DESC`);
  // Filter choices only include students with submissions; no full-roster overfetch.
  const { rows: studentOptions } = await db.execute<{ id: string; name: string }>(sql`
    SELECT s.id, s.display_name || COALESCE(' · ' || s.group_label,'') || ' · ' || right(s.id::text,6) name FROM students s
    WHERE EXISTS(SELECT 1 FROM lesson_attempts a WHERE a.student_id=s.id AND a.status='submitted') ORDER BY s.lookup_name,s.id`);
  return { lessonOptions, studentOptions };
}
type ReviewRow = { attemptId: string; questionId: string; studentId: string; name: string; group: string | null; title: string | null; version: number | null; prompt: string | null; response: string; submittedAt: Date; status: string; points: number | null; maximum: number | null; feedback: string | null; total: number };
export async function reviewQueue(db: Connection, url: URL) {
  const f = filters(url), reviewed = url.searchParams.get('state') === 'reviewed';
  const { rows } = await db.execute<ReviewRow>(sql`
    SELECT a.id AS "attemptId", e.question_id AS "questionId",s.id AS "studentId",s.display_name name,s.group_label AS "group",v.title,v.version,q.content->>'prompt' prompt,
    e.response #>> '{}' response,a.submitted_at AS "submittedAt",e.effective_status status,e.effective_points points,q.max_points maximum,e.feedback,count(*) OVER()::int total
    FROM effective_answers e JOIN lesson_attempts a ON a.id=e.attempt_id JOIN students s ON s.id=a.student_id
    LEFT JOIN questions q ON q.id=e.question_id LEFT JOIN lesson_versions v ON v.id=a.version_id
    WHERE a.status='submitted' AND (q.grading->>'mode'='manual' OR e.review_status='pending') AND (has_student_response(e.response,q.grading) OR (e.review_status='pending' AND q.content->'task'->>'listening'='true'))
    AND ${reviewed ? sql`e.review_id IS NOT NULL` : sql`e.effective_status='pending'`}
    AND (${f.lesson}::uuid IS NULL OR a.lesson_id=${f.lesson}::uuid) AND (${f.student}::uuid IS NULL OR s.id=${f.student}::uuid)
    ORDER BY a.submitted_at,a.id,q.position LIMIT ${PAGE_SIZE} OFFSET ${(f.page - 1) * PAGE_SIZE}`);
  return { rows, total: rows[0]?.total ?? 0, ...f, reviewed, ...await filterOptions(db) };
}
export async function questionPerformance(db: Connection, url: URL) {
  const f = filters(url), sort = url.searchParams.get('sort') === 'count' ? 'count' : 'percent';
  const { rows } = await db.execute<{ questionId: string; versionId: string; version: number; title: string; unit: string; prompt: string | null; graded: number; correct: number; incorrect: number; unanswered: number; pending: number; percent: number | null; total: number }>(sql`
    WITH firsts AS (
      SELECT DISTINCT ON (student_id,version_id) * FROM lesson_attempts WHERE status='submitted'
      ORDER BY student_id,version_id,submitted_at,id
    ), stats AS (
      SELECT q.id AS "questionId",q.version_id AS "versionId",v.version,v.title,u.title unit,q.content->>'prompt' prompt,
      count(*) FILTER(WHERE has_student_response(e.response,q.grading) AND e.effective_status='graded' AND e.effective_points IS NOT NULL)::int graded,
      count(*) FILTER(WHERE has_student_response(e.response,q.grading) AND e.effective_status='graded' AND e.effective_points=q.max_points)::int correct,
      count(*) FILTER(WHERE has_student_response(e.response,q.grading) AND e.effective_status='graded' AND e.effective_points<q.max_points)::int incorrect,
      count(*) FILTER(WHERE NOT has_student_response(e.response,q.grading))::int unanswered,
      count(*) FILTER(WHERE has_student_response(e.response,q.grading) AND (e.effective_status IS DISTINCT FROM 'graded' OR e.effective_points IS NULL))::int pending
      FROM firsts a JOIN questions q ON q.version_id=a.version_id JOIN lesson_versions v ON v.id=a.version_id
      JOIN lessons l ON l.id=a.lesson_id JOIN units u ON u.id=l.unit_id
      LEFT JOIN effective_answers e ON e.attempt_id=a.id AND e.question_id=q.id
      WHERE (${f.lesson}::uuid IS NULL OR l.id=${f.lesson}::uuid)
      GROUP BY q.id,q.version_id,v.version,v.title,u.title
    ), rates AS (SELECT *,100.0*incorrect/NULLIF(correct+incorrect,0) percent FROM stats)
    SELECT *,count(*) OVER()::int total FROM rates
    ORDER BY ${sort === 'count' ? sql`incorrect DESC,percent DESC NULLS LAST` : sql`percent DESC NULLS LAST,incorrect DESC`},"questionId"
    LIMIT ${PAGE_SIZE} OFFSET ${(f.page - 1) * PAGE_SIZE}`);
  return { rows, total: rows[0]?.total ?? 0, ...f, sort, ...await filterOptions(db) };
}
export async function attemptDetail(db: Connection, id: string) {
  const [attempt] = await db.select().from(lessonAttempts).where(eq(lessonAttempts.id, uuid(id)));
  if (!attempt) reject(404, 'ATTEMPT_NOT_FOUND', 'Urinish topilmadi.');
  const [student] = await db.select().from(students).where(eq(students.id, attempt.studentId));
  const [version] = await db.select().from(lessonVersions).where(eq(lessonVersions.id, attempt.versionId));
  const { rows } = await db.execute<{ questionId: string; position: number | null; content: import('../learning/contracts').QuestionContent | null; grading: import('../learning/contracts').GradingRule | null; maxPoints: number | null; response: string | null; automaticPoints: number | null; automaticStatus: string | null; points: number | null; status: string | null; reviewRevision: number | null; feedback: string | null }>(sql`
    SELECT COALESCE(q.id,e.question_id) AS "questionId",q.position,q.content,q.grading,q.max_points AS "maxPoints",e.response #>> '{}' response,
    e.earned_points AS "automaticPoints",e.review_status AS "automaticStatus",e.effective_points points,e.effective_status status,e.review_revision AS "reviewRevision",e.feedback
    FROM (SELECT * FROM questions WHERE version_id=${attempt.versionId}) q
    FULL JOIN (SELECT * FROM effective_answers WHERE attempt_id=${id}) e ON e.question_id=q.id ORDER BY q.position NULLS LAST,e.question_id`);
  const reviews = await db.select().from(teacherReviews).where(eq(teacherReviews.attemptId, id)).orderBy(desc(teacherReviews.createdAt), desc(teacherReviews.revision));
  const {rows:checks}=await db.execute<{questionId:string;response:string;earnedPoints:number|null;reviewStatus:string;transcriptUsed:boolean;createdAt:Date}>(sql`SELECT question_id AS "questionId",response,earned_points AS "earnedPoints",review_status AS "reviewStatus",transcript_used AS "transcriptUsed",created_at AS "createdAt" FROM practice_checks WHERE attempt_id=${id} ORDER BY created_at`);
  const {rows:support}=await db.execute<{audioPlays:number;audioStatus:string;transcriptUsed:boolean;sectionId:string}>(sql`SELECT audio_plays AS "audioPlays",audio_status AS "audioStatus",transcript_used AS "transcriptUsed",section_id AS "sectionId" FROM study_workspaces WHERE attempt_id=${id}`);
  return { attempt, student, version: version ?? null, questions: rows.map(q => ({ ...q, requestId: randomUUID() })), reviews,checks,support:support[0]??null };
}
