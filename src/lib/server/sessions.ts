import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import type { Connection, Database } from './db/connect';
import { entryTickets, students, studentSessions } from './db/schema';
import { enterStudent, lockStudent, studentFields } from './students';

export const SESSION_COOKIE = 'ewj_session';
export const ENTRY_COOKIE = 'ewj_entry';
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
export const validToken = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

async function createSession(tx: Connection, studentId: string) {
  const student = await lockStudent(tx, studentId);
  const secret = token();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await tx.insert(studentSessions).values({ tokenHash: hashToken(secret), studentId, expiresAt });
  return { token: secret, expiresAt, student };
}
export async function resolveEntry(db: Database, name: unknown) {
  return db.transaction(async tx => {
    // Opportunistic cleanup keeps temporary/session storage bounded for this class.
    await tx.delete(entryTickets).where(lt(entryTickets.expiresAt, new Date()));
    await tx.delete(studentSessions).where(lt(studentSessions.expiresAt, new Date()));
    const student = await enterStudent(tx, name);
    return { kind: 'session' as const, ...await createSession(tx, student.id) };
  });
}
export async function restoreSession(db: Connection, secret: string | undefined) {
  if (!validToken(secret)) return null;
  const [row] = await db.select(studentFields).from(studentSessions).innerJoin(students, eq(students.id, studentSessions.studentId))
    .where(and(eq(studentSessions.tokenHash, hashToken(secret)), gt(studentSessions.expiresAt, new Date()), eq(students.status, 'active')));
  return row ?? null;
}
export async function endSession(db: Connection, secret: string | undefined) {
  if (validToken(secret)) await db.delete(studentSessions).where(eq(studentSessions.tokenHash, hashToken(secret)));
}
