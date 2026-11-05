import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/engine.mjs';
const progress=session=>engine.sessionProgress?.(session);

test('adding a retry keeps the original question total and completed count stable',()=>{
 const s={queue:['a','b','c','d','e'],index:0,responses:[]};
 assert.deepEqual(progress(s),{total:5,completed:0,currentNumber:1,isReview:false,percent:0});
 s.queue=engine.insertRepeat(s.queue,0,'a');s.responses.push({id:'a',correct:false,rating:'again'});s.index=1;
 assert.deepEqual(progress(s),{total:5,completed:1,currentNumber:2,isReview:false,percent:20});
});
test('the replay shows the original question number and cannot count as a new completion',()=>{
 const s={queue:['a','b','c','d','a','e'],index:4,responses:[{id:'a'},{id:'b'},{id:'c'},{id:'d'}]};
 assert.deepEqual(progress(s),{total:5,completed:4,currentNumber:1,isReview:true,percent:80});
 s.responses.push({id:'a'});s.index=5;
 assert.deepEqual(progress(s),{total:5,completed:4,currentNumber:5,isReview:false,percent:80});
 s.responses.push({id:'e'});s.index=6;
 assert.deepEqual(progress(s),{total:5,completed:5,currentNumber:null,isReview:false,percent:100});
});
test('restoring an older session with repeated IDs preserves the correct progress',()=>{
 const raw={id:'legacy',queue:['a','b','c','d','a','e'],index:4,responses:[{id:'a',correct:false,rating:'again',at:1},{id:'b',correct:true,rating:'sure',at:2},{id:'c',correct:true,rating:'sure',at:3},{id:'d',correct:true,rating:'sure',at:4}],phase:'recall',selected:null,duration:1800,elapsed:60,activeSince:1000,paused:true};
 const restored=engine.restoreSession(raw,['a','b','c','d','e'].map(id=>({id,choices:['yes','no']})),2000);
 assert.deepEqual(progress(restored),{total:5,completed:4,currentNumber:1,isReview:true,percent:80});
});
