import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LatestWriteQueue} from '../src/lib/learning/latest-write';

test('checkpoints coalesce rapid next-window clicks and never require waiting for a previous remote write',async()=>{
 let release!:()=>void;const calls:number[]=[];
 const queue=new LatestWriteQueue<number>(async value=>{calls.push(value);if(value===1)await new Promise<void>(resolve=>release=resolve);},()=>{},100000);
 queue.enqueue(1);const first=queue.flush();assert.deepEqual(calls,[1]);
 queue.enqueue(2);queue.enqueue(3);queue.enqueue(4);
 assert.deepEqual(calls,[1]); // The UI can already be on window 4 while 1 is in flight.
 release();await first;assert.deepEqual(calls,[1,4]);queue.stop();
});
test('failed checkpoint preserves its latest value for an explicit retry',async()=>{
 let fail=true;const calls:string[]=[];
 const queue=new LatestWriteQueue<string>(async value=>{calls.push(value);if(fail)throw Error('offline');},()=>{},100000);
 queue.enqueue('practice-7');await assert.rejects(queue.flush(),/offline/);fail=false;
 await queue.flush();assert.deepEqual(calls,['practice-7','practice-7']);queue.stop();
});
test('lesson window transitions have no network wait and lesson-only exams/sublesson tabs are absent',async()=>{
 const code=await readFile('src/routes/learn/[lessonId]/+page.svelte','utf8');
 const move=code.slice(code.indexOf('async function move('),code.indexOf('function selectPanel('));
 assert(!/await\s+(?:flush|request|savePosition)/.test(move));
 assert(!code.includes('class="section-steps"'));assert(!code.includes('Darsni yakunlash'));
 assert(code.includes('if review&&exam'));assert(code.includes('bootstrap:true'));
});
