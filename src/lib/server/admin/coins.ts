import { eq } from 'drizzle-orm';
import type { Database } from '../db/connect';
import { coinAdjustments, students } from '../db/schema';
import { lockTeacherSession } from '../teacher-sessions';
import { reject, uuid } from '../validation';

export async function adjustCoins(db: Database, teacherId: string, studentId: string, form: FormData) {
 const requestId=uuid(form.get('requestId'));uuid(studentId);
 const amount=String(form.get('amount')??''),operation=form.get('operation');
 if(!/^[1-9]\d*$/.test(amount)||!['add','subtract'].includes(String(operation)))reject(400,'INVALID_AMOUNT','Musbat butun son kiriting va amalni tanlang.');
 const delta=Number(amount)*(operation==='subtract'?-1:1),reason=String(form.get('reason')??'').trim();
 if(!Number.isSafeInteger(delta)||reason.length>500)reject(400,'INVALID_AMOUNT','Butun son yoki izoh uzunligi noto‘g‘ri.');
 return db.transaction(async tx=>{
  await lockTeacherSession(tx,teacherId);
  const [student]=await tx.select({id:students.id}).from(students).where(eq(students.id,studentId)).for('update');
  if(!student)reject(404,'STUDENT_NOT_FOUND','O‘quvchi topilmadi.');
  const [receipt]=await tx.select().from(coinAdjustments).where(eq(coinAdjustments.requestId,requestId));
  if(receipt){if(receipt.studentId!==studentId||receipt.delta!==delta||receipt.reason!==reason)reject(409,'REQUEST_CONFLICT','Bu so‘rov oldin boshqa ma’lumot bilan saqlangan.');return receipt;}
  return (await tx.insert(coinAdjustments).values({requestId,studentId,teacherSessionId:teacherId,delta,reason}).returning())[0];
 });
}
