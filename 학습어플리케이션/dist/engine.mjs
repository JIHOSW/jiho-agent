const DAY=86400000;
const count=(n,max=1000000)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.trunc(n))):0;
export function normalizeState(raw,ids){
 const allowed=new Set(ids),out={version:1,stats:{},bookmarks:[],history:[]};
 if(!raw||typeof raw!=='object')return out;
 for(const [id,s] of Object.entries(raw.stats??{})){
  if(!allowed.has(id)||!s||typeof s!=='object')continue;
  const seen=count(s.seen);
  out.stats[id]={seen,correct:count(s.correct,seen),lapses:count(s.lapses,seen),streak:count(s.streak,seen),due:count(s.due,9e15),lastRating:['again','guess','sure'].includes(s.lastRating)?s.lastRating:'again',lastAt:count(s.lastAt,9e15)};
 }
 out.bookmarks=[...new Set(Array.isArray(raw.bookmarks)?raw.bookmarks:[])].filter(id=>allowed.has(id));
 out.history=(Array.isArray(raw.history)?raw.history:[]).filter(h=>h&&typeof h.id==='string'&&Number.isFinite(h.at)&&Number.isFinite(h.total)&&Number.isFinite(h.correct)).slice(-60).map(h=>({id:h.id.slice(0,80),at:h.at,total:count(h.total,500),correct:count(h.correct,count(h.total,500)),seconds:count(h.seconds,1800)}));
 return out;
}
export function buildQueue(bank,state,{mode='tonight',day=1,limit=18,now=Date.now(),subject=0}={}){
 const pool=bank.filter(q=>(!subject||q.subject===subject)&&(mode!=='weak'||(state.stats[q.id]?.seen>0&&state.stats[q.id]?.lastRating!=='sure'))&&(mode!=='bookmarks'||state.bookmarks.includes(q.id)));
 function priority(q){const s=state.stats[q.id];if(s?.seen&&s.lastRating!=='sure')return 0;if(!s?.seen&&q.day===day)return 1;if(!s?.seen)return 2;if(s.due<=now)return 3;return 5;}
 return pool.map((q,i)=>({q,i,p:priority(q)})).sort((a,b)=>a.p-b.p||(state.stats[a.q.id]?.lastAt??0)-(state.stats[b.q.id]?.lastAt??0)||a.i-b.i).slice(0,limit).map(({q})=>q.id);
}
export function grade(state,id,correct,rating,now=Date.now()){
 const last=state.stats[id]??{seen:0,correct:0,lapses:0,streak:0};
 const effective=correct&&rating==='sure'?'sure':correct&&rating==='guess'?'guess':'again';
 const streak=effective==='sure'?last.streak+1:0;
 return {...state,stats:{...state.stats,[id]:{seen:last.seen+1,correct:last.correct+Number(correct),lapses:last.lapses+Number(!correct),streak,due:now+(streak>=2?3*DAY:DAY),lastRating:effective,lastAt:now}}};
}
export function insertRepeat(queue,index,id){
 const next=queue.slice(0,index+1).concat(queue.slice(index+1).filter(x=>x!==id));
 if(next.length-index-1<3)return next;
 next.splice(Math.min(index+4,next.length),0,id);return next;
}
export function sessionProgress(session){
 const questions=[...new Set(session.queue)],allowed=new Set(questions);
 const completed=new Set(session.responses.filter(r=>allowed.has(r.id)).map(r=>r.id)).size;
 const currentId=session.queue[session.index],isReview=currentId!==undefined&&session.responses.some(r=>r.id===currentId);
 return {total:questions.length,completed,currentNumber:currentId===undefined?null:questions.indexOf(currentId)+1,isReview,percent:questions.length?completed/questions.length*100:0};
}
export function remainingSeconds(session,now=Date.now()){
 const delta=session.paused?0:Math.max(0,(now-session.activeSince)/1000);
 return Math.max(0,Math.ceil((session.duration??1800)-(session.elapsed??0)-delta));
}
export function resumeSession(session,now=Date.now()){
 return {...session,elapsed:(session.duration??1800)-remainingSeconds(session,now),activeSince:now,paused:false};
}
export function restoreSession(raw,bank,now=Date.now()){
 if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||raw.id.length>100||!Array.isArray(raw.queue)||!raw.queue.length||raw.queue.length>100||!Number.isInteger(raw.index)||raw.index<0||raw.index>=raw.queue.length)return null;
 const map=new Map(bank.map(q=>[q.id,q]));
 if(raw.queue.some(id=>!map.has(id)))return null;
 const question=map.get(raw.queue[raw.index]);
 const selected=Number.isInteger(raw.selected)&&raw.selected>=0&&raw.selected<question.choices.length?raw.selected:null;
 const phase=['recall','choices','feedback'].includes(raw.phase)?raw.phase:'recall';
 const responses=(Array.isArray(raw.responses)?raw.responses:[]).filter(r=>r&&map.has(r.id)&&typeof r.correct==='boolean'&&['again','guess','sure'].includes(r.rating)&&Number.isFinite(r.at)).slice(0,100).map(r=>({id:r.id,correct:r.correct,rating:r.rating,at:r.at,review:!!r.review}));
 return {id:raw.id,queue:[...raw.queue],index:raw.index,phase:phase==='feedback'&&selected===null?'choices':phase,selected,responses,duration:1800,elapsed:count(raw.elapsed,1800),activeSince:Number.isFinite(raw.activeSince)?Math.min(now,Math.max(0,raw.activeSince)):now,paused:!!raw.paused,mode:['tonight','weak','bookmarks'].includes(raw.mode)?raw.mode:'tonight',day:[1,2,3].includes(raw.day)?raw.day:1,startedAt:Number.isFinite(raw.startedAt)?raw.startedAt:now};
}
export function validatePack(raw){
 const list=Array.isArray(raw)?raw:raw?.questions;
 if(!Array.isArray(list)||!list.length||list.length>500)throw new Error('문제는 1~500개까지 가져올 수 있어요.');
 const used=new Set();
 return list.map((q,i)=>{
  if(!q||typeof q!=='object')throw new Error(`${i+1}번 문제 형식을 확인해주세요.`);
  const id=String(q.id??`custom-${i+1}`);
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||['__proto__','prototype','constructor'].includes(id)||used.has(id))throw new Error('문제 ID가 중복되거나 올바르지 않아요.');used.add(id);
  const text=(key,max,required=true)=>{const v=q[key];if((required&&(typeof v!=='string'||!v.trim()))||(v!=null&&(typeof v!=='string'||v.length>max)))throw new Error(`${i+1}번 문제의 ${key} 항목을 확인해주세요.`);return (v??'').trim();};
  const choices=q.choices;
  if(!Array.isArray(choices)||choices.length<2||choices.length>4||choices.some(c=>typeof c!=='string'||!c.trim()||c.length>1000)||!Number.isInteger(q.answer)||q.answer<0||q.answer>=choices.length)throw new Error(`${i+1}번 문제의 보기와 정답 번호를 확인해주세요.`);
  if(![1,2,3].includes(q.subject))throw new Error('과목은 1, 2, 3 중 하나예요.');
  let url=text('sourceUrl',1500,false);if(url){let parsed;try{parsed=new URL(url);}catch{throw new Error('출처 주소를 확인해주세요.');}if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error('출처는 http 또는 https 주소만 사용할 수 있어요.');url=parsed.href;}
  return {id,subject:q.subject,topic:text('topic',100,false)||'내 문제',day:[1,2,3].includes(q.day)?q.day:1,prompt:text('prompt',5000),choices:choices.map(c=>c.trim()),answer:q.answer,explanation:text('explanation',5000),memory:text('memory',500,false)||'해설의 핵심을 한 문장으로 떠올려보세요.',recall:text('recall',500,false)||'보기 전에 관련 개념을 떠올려보세요.',source:text('source',200,false)||'내가 추가한 자료',sourceUrl:url,custom:true};
 });
}
export function prepareQuestionImport(raw){
 const normalized=validatePack(raw).map(q=>({...q,id:q.id.startsWith('local-')?q.id:`local-${q.id}`}));
 return validatePack(normalized);
}
