import {after,before,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {testDatabase} from './database';
import {createStudent} from '../src/lib/server/students';
import {createTeacherSession,endTeacherSession} from '../src/lib/server/teacher-sessions';
import {adjustCoins} from '../src/lib/server/admin/coins';
import {homeData} from '../src/lib/server/learning/catalog';
import {rankings} from '../src/lib/server/learning/rewards';
import {coinAdjustments} from '../src/lib/server/db/schema';
let store:Awaited<ReturnType<typeof testDatabase>>;
before(async()=>{store=await testDatabase();});after(async()=>{await store?.close();});
function form(amount:string,operation='add',requestId:string=randomUUID()){const f=new FormData();f.set('amount',amount);f.set('operation',operation);f.set('requestId',requestId);f.set('reason','Classroom adjustment');return f;}
test('teacher can add/subtract arbitrary whole amounts, including negative balances; retries do not duplicate',async()=>{
 const {db}=store,s=await createStudent(db,'Adjusted learner'),teacher=await createTeacherSession(db);
 const request=form('1000000');const [first,retry]=await Promise.all([adjustCoins(db,teacher.id,s.id,request),adjustCoins(db,teacher.id,s.id,request)]);
 assert.equal(first.requestId,retry.requestId);assert.equal((await homeData(db,s.id)).totalPoints,1000000);
 await adjustCoins(db,teacher.id,s.id,form('1000250','subtract'));assert.equal((await homeData(db,s.id)).totalPoints,-250);
 assert.equal((await rankings(db,s.id)).find(r=>r.isCurrent)?.points,-250);
 assert.equal((await db.select().from(coinAdjustments).where(eq(coinAdjustments.studentId,s.id))).length,2);
 await assert.rejects(adjustCoins(db,teacher.id,s.id,form('2','add',first.requestId)),{code:'REQUEST_CONFLICT'});
 await assert.rejects(db.update(coinAdjustments).set({reason:'overwrite'}).where(eq(coinAdjustments.studentId,s.id)));
 await endTeacherSession(db,teacher.token);await assert.rejects(adjustCoins(db,teacher.id,s.id,form('1')),{code:'TEACHER_SESSION_ENDED'});
});
test('coin mutations require an active teacher and reject malformed amounts',async()=>{
 const {db}=store,s=await createStudent(db,'Coin validation learner'),teacher=await createTeacherSession(db);
 for(const value of ['0','-5','1.5','NaN','1e4','9007199254740992'])await assert.rejects(adjustCoins(db,teacher.id,s.id,form(value)),{code:'INVALID_AMOUNT'});
 await assert.rejects(adjustCoins(db,randomUUID(),s.id,form('20')),{code:'TEACHER_SESSION_ENDED'});
 assert.equal((await homeData(db,s.id)).totalPoints,0);
});

test('multiple large adjustments retain exact totals and exact ranking order',async()=>{
 const {db}=store,a=await createStudent(db,'Large balance A'),b=await createStudent(db,'Large balance B'),teacher=await createTeacherSession(db);
 for(const s of [a,b])await adjustCoins(db,teacher.id,s.id,form(String(Number.MAX_SAFE_INTEGER)));
 await adjustCoins(db,teacher.id,a.id,form('2'));await adjustCoins(db,teacher.id,b.id,form('1'));
 assert.equal((await homeData(db,a.id)).totalPoints,'9007199254740993');
 const rows=await rankings(db,a.id);assert.equal(rows[0].name,a.displayName);assert.equal(rows[0].points,'9007199254740993');assert.equal(rows[1].points,'9007199254740992');
});
