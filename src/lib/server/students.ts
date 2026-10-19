import { and, eq } from 'drizzle-orm';
import type { Connection, Database } from './db/connect';
import { students, studentSessions } from './db/schema';
import { displayName, normalizeName, reject, uuid } from './validation';
import { teacherEntryName } from './teacher-config';

export const studentFields = { id: students.id, displayName: students.displayName, groupLabel: students.groupLabel };
export function reservedStudentName(name: string) {
  const configured = teacherEntryName();
  const lookup = normalizeName(name);
  return !!configured && lookup === normalizeName(configured);
}
export async function lockStudent(tx: Connection, studentId: string) {
  const [student] = await tx.select(studentFields).from(students).where(and(eq(students.id, uuid(studentId)), eq(students.status, 'active'))).for('update');
  return student ?? reject(401, 'SESSION_ENDED', 'Profil faol emas. Qayta kiring.');
}
export async function findStudents(db: Connection, name: unknown) {
  const lookup = normalizeName(displayName(name));
  if (reservedStudentName(lookup)) return [];
  return db.select(studentFields).from(students).where(and(eq(students.lookupName, lookup), eq(students.status, 'active'))).orderBy(students.displayName, students.groupLabel, students.id);
}
function group(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > 80 || /[\p{Cc}\p{Cf}]/u.test(value)) return reject(400, 'INVALID_GROUP', 'Guruh nomi noto‘g‘ri.');
  return value.trim() || null;
}
export async function createStudent(db: Connection, name: unknown, groupLabel?: unknown) {
  const clean = displayName(name);
  if (reservedStudentName(clean)) return reject(400, 'RESERVED_NAME', 'Bu nom o‘qituvchi uchun ajratilgan.');
  const [student] = await db.insert(students).values({ displayName: clean, lookupName: normalizeName(clean), groupLabel: group(groupLabel) })
    .onConflictDoNothing({ target: students.lookupName }).returning(studentFields);
  return student ?? reject(409, 'DUPLICATE_NAME', 'Bu ism bilan profil mavjud. Alohida profil uchun boshqa ism kiriting.');
}
// The session transaction and unique lookup name serialize concurrent first
// visits without changing an existing profile's name, group or learning history.
export async function enterStudent(tx: Connection, name: unknown) {
  const clean = displayName(name);
  if (reservedStudentName(clean)) return reject(400, 'RESERVED_NAME', 'Bu nom o‘qituvchi uchun ajratilgan.');
  const lookup = normalizeName(clean);
  await tx.insert(students).values({ displayName: clean, lookupName: lookup }).onConflictDoNothing({ target: students.lookupName });
  const [student] = await tx.select({ ...studentFields, status: students.status }).from(students).where(eq(students.lookupName, lookup)).for('update');
  // A teacher rename may free the name between INSERT and SELECT.
  if (!student) return reject(409, 'ENTRY_RETRY', 'Profil nomi o‘zgardi. Ismingizni qayta kiriting.');
  if (student.status !== 'active') return reject(403, 'ARCHIVED_NAME', 'Bu profil nofaol. Uni tiklash uchun o‘qituvchiga murojaat qiling.');
  return student;
}
export async function renameStudent(db: Database, id: string, name: unknown, groupLabel?: unknown) {
  const clean = displayName(name);
  if (reservedStudentName(clean)) return reject(400, 'RESERVED_NAME', 'Bu nom o‘qituvchi uchun ajratilgan.');
  return db.transaction(async tx => {
    const [existing] = await tx.select().from(students).where(eq(students.id, uuid(id))).for('update');
    if (!existing) return reject(404, 'STUDENT_NOT_FOUND', 'O‘quvchi topilmadi.');
    let student;
    try {
      [student] = await tx.update(students).set({ displayName: clean, lookupName: normalizeName(clean), ...(groupLabel !== undefined ? { groupLabel: group(groupLabel) } : {}), updatedAt: new Date() }).where(eq(students.id, id)).returning(studentFields);
    } catch (error) {
      const cause = error instanceof Error && 'cause' in error ? error.cause : error;
      if (cause && typeof cause === 'object' && 'code' in cause && cause.code === '23505') return reject(409, 'DUPLICATE_NAME', 'Bu ism bilan boshqa profil mavjud. Boshqa ism kiriting.');
      throw error;
    }
    return student;
  });
}
export async function reactivateStudent(db: Database, id: string) {
  await db.transaction(async tx => {
    const [student] = await tx.select().from(students).where(eq(students.id, uuid(id))).for('update');
    if (!student) return reject(404, 'STUDENT_NOT_FOUND', 'O‘quvchi topilmadi.');
    if (reservedStudentName(student.displayName)) return reject(400, 'RESERVED_NAME', 'Avval profil nomini o‘zgartiring.');
    await tx.update(students).set({ status: 'active', updatedAt: new Date() }).where(eq(students.id, id));
  });
}
export async function archiveStudent(db: Database, id: string) {
  await db.transaction(async tx => {
    const [student] = await tx.select().from(students).where(eq(students.id, uuid(id))).for('update');
    if (!student) return reject(404, 'STUDENT_NOT_FOUND', 'O‘quvchi topilmadi.');
    await tx.update(students).set({ status: 'archived', updatedAt: new Date() }).where(eq(students.id, id));
    await tx.delete(studentSessions).where(eq(studentSessions.studentId, id));
  });
}
