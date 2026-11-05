import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQueue,grade,insertRepeat,remainingSeconds,normalizeState,validatePack,restoreSession,resumeSession,prepareQuestionImport} from '../dist/engine.mjs';
const bank=[{id:'a',day:1,subject:1},{id:'b',day:2,subject:2},{id:'c',day:1,subject:3},{id:'d',day:1,subject:2}];
const blank=()=>({version:1,stats:{},bookmarks:[],history:[]});

test('due weak question outranks unseen and confidently learned items',()=>{
 const state=blank();state.stats.a={seen:1,correct:0,lapses:1,streak:0,due:10,lastRating:'again'};
 state.stats.c={seen:2,correct:2,lapses:0,streak:2,due:99999,lastRating:'sure'};
 const q=buildQueue(bank,state,{now:100,day:1,limit:4});
 assert.equal(q[0],'a');assert.equal(q.at(-1),'c');assert.equal(new Set(q).size,4);
});
test('weak and bookmarked modes do not silently include unseen questions',()=>{
 const state=blank();state.stats.b={seen:1,lastRating:'guess',due:9999};state.bookmarks=['c'];
 assert.deepEqual(buildQueue(bank,state,{mode:'weak',now:0}),['b']);
 assert.deepEqual(buildQueue(bank,state,{mode:'bookmarks',now:0}),['c']);
 assert.deepEqual(buildQueue(bank,blank(),{mode:'weak'}),[]);
});
test('yesterday weak questions lead the next session even before 24 hours elapsed',()=>{
 const state=grade(blank(),'a',false,'again',0);
 const q=buildQueue(bank,state,{day:2,now:23*3600000,limit:1});assert.deepEqual(q,['a']);
});
test('correct guess remains due for next night; two confident recalls expand interval',()=>{
 let s=grade(blank(),'a',true,'guess',1000);
 assert.equal(s.stats.a.streak,0);assert.equal(s.stats.a.due,1000+86400000);
 s=grade(s,'a',true,'sure',2000);assert.equal(s.stats.a.streak,1);
 s=grade(s,'a',true,'sure',3000);assert.equal(s.stats.a.streak,2);assert.equal(s.stats.a.due,3000+259200000);
 const missed=grade(s,'a',false,'sure',4000);assert.equal(missed.stats.a.streak,0);assert.equal(missed.stats.a.lastRating,'again');
});
test('repeat waits for three other questions and is not duplicated',()=>{
 assert.deepEqual(insertRepeat(['a','b','c','d','e'],0,'a'),['a','b','c','d','a','e']);
 assert.deepEqual(insertRepeat(['a','b','a','c','d'],0,'a'),['a','b','c','d','a']);
});
test('last item is deferred to next session instead of repeated immediately',()=>{
 assert.deepEqual(insertRepeat(['a'],0,'a'),['a']);
});
test('restore preserves feedback and chosen answer but rejects damaged sessions',()=>{
 const source={id:'s',queue:['a','b'],index:0,phase:'feedback',selected:1,responses:[],duration:1800,elapsed:12,activeSince:10000,paused:false};
 const resumed=restoreSession(source,[{id:'a',choices:['one','two']},{id:'b',choices:['one','two']}],20000);
 assert.equal(resumed.phase,'feedback');assert.equal(resumed.selected,1);assert.equal(remainingSeconds(resumed,20000),1778);
 assert.equal(restoreSession({...source,queue:['alien']},bank,20000),null);
 assert.equal(restoreSession({...source,index:900},bank,20000),null);
});
test('countdown survives reload, stays paused, expires at zero',()=>{
 const session={duration:1800,elapsed:120,activeSince:10000,paused:false};
 assert.equal(remainingSeconds(session,40000),1650);
 assert.equal(remainingSeconds({...session,paused:true},40000),1680);
 assert.equal(remainingSeconds(session,99999999),0);
});
test('resuming after reload cannot reset elapsed active time',()=>{
 const s={duration:1800,elapsed:120,activeSince:10000,paused:false};
 const resumed=resumeSession(s,40000);assert.equal(remainingSeconds(resumed,40000),1650);
 const paused=resumeSession({...s,paused:true},40000);assert.equal(remainingSeconds(paused,40000),1680);
});
test('malformed saved state is safe and unknown question IDs are discarded',()=>{
 assert.deepEqual(normalizeState(null,['a']),blank());
 const s=normalizeState({stats:{a:{seen:2,correct:8,streak:-1,due:'oops'},alien:{seen:3}},bookmarks:['a','x','a'],history:'bad'},['a']);
 assert.deepEqual(s.bookmarks,['a']);assert.equal(s.stats.alien,undefined);assert.equal(s.stats.a.correct,2);assert.equal(s.stats.a.streak,0);assert.equal(s.stats.a.due,0);
});
const item={id:'x',subject:2,topic:'계산',day:2,prompt:'질문',choices:['A','B'],answer:0,explanation:'해설',memory:'암기',recall:'떠올려요',source:'직접 입력'};
test('import validates answer index, unique IDs, pack size and unsafe source URLs',()=>{
 assert.equal(validatePack([item])[0].prompt,'질문');
 assert.throws(()=>validatePack([{...item,answer:2}]));
 assert.throws(()=>validatePack([item,item]));
 assert.throws(()=>validatePack([{...item,sourceUrl:'javascript:alert(1)'}]));
 assert.throws(()=>validatePack(Array.from({length:501},(_,i)=>({...item,id:'x'+i}))));
 assert.throws(()=>validatePack([{...item,prompt:'a'.repeat(5001)}]));
});
test('normalizing import IDs cannot introduce duplicates that erase the bank on reload',()=>{
 assert.throws(()=>prepareQuestionImport([item,{...item,id:'local-x'}]));
 const pack=prepareQuestionImport([item]);assert.equal(pack[0].id,'local-x');assert.equal(validatePack(pack).length,1);
});
