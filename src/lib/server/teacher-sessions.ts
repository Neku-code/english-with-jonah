import { randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Connection, Database } from './db/connect';
import { teacherSessions } from './db/schema';
import { hashToken, validToken } from './sessions';
import { reject } from './validation';

export const TEACHER_COOKIE = 'ewj_teacher';
export const TEACHER_SECONDS = 60 * 60 * 12;
export function matchesTeacherEntry(raw: unknown, configured: string | undefined) {
  if (!configured || typeof raw !== 'string') return false;
  const a = Buffer.from(raw), b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function createTeacherSession(db: Database) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TEACHER_SECONDS * 1000);
  const [session] = await db.insert(teacherSessions).values({ tokenHash: hashToken(token), expiresAt }).returning({ id: teacherSessions.id });
  return { ...session, token, expiresAt };
}
export async function restoreTeacherSession(db: Connection, token: string | undefined) {
  if (!validToken(token)) return null;
  const [session] = await db.select({ id: teacherSessions.id }).from(teacherSessions).where(and(eq(teacherSessions.tokenHash, hashToken(token)), gt(teacherSessions.expiresAt, new Date()), isNull(teacherSessions.revokedAt)));
  return session ?? null;
}
export async function endTeacherSession(db: Connection, token: string | undefined) {
  if (validToken(token)) await db.update(teacherSessions).set({ revokedAt: new Date() }).where(eq(teacherSessions.tokenHash, hashToken(token)));
}
export async function lockTeacherSession(db: Connection, id: string) {
  const [session] = await db.select({ id: teacherSessions.id }).from(teacherSessions).where(and(eq(teacherSessions.id, id), gt(teacherSessions.expiresAt, new Date()), isNull(teacherSessions.revokedAt))).for('update');
  if (!session) reject(401, 'TEACHER_SESSION_ENDED', 'O‘qituvchi sessiyasi tugadi. Qayta kiring.');
}
