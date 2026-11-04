import test from 'node:test';
import assert from 'node:assert/strict';
import {getCase,analyzeDemo,createTask,restoreState} from '../lib/firstmile/domain.mjs';
let customers;try{customers=await import('../lib/firstmile/customers.mjs');}catch{}
const input={name:'테스트테크',industry:'IT 서비스',owner:'홍담당',users:20,startDate:'2026-11-04',target:'2026-11-20',goal:'계약서 1건의 게시와 팀원 검색 완료'};
test('registers a manual customer with zero observed progress and stable identity',()=>{
 assert.ok(customers,'registration domain is missing');const [c]=customers.createCustomer([],input);
 assert.match(c.id,/^custom-/);assert.equal(c.completed,0);assert.equal(c.source,'manual');assert.equal(c.name,'테스트테크');
 assert.equal(customers.validateCustomer(c).id,c.id);
});
test('rejects duplicate seeded/manual names and invalid fields',()=>{
 assert.ok(customers);const list=customers.createCustomer([],input);
 assert.throws(()=>customers.createCustomer(list,{...input,name:' 테스트 테크 '}));
 assert.throws(()=>customers.createCustomer([],{...input,name:'모노랩'}));
 for(const change of [{name:' '},{owner:''},{users:0},{users:1.5},{startDate:'2026-02-31'},{target:'2026-11-01'},{goal:''}])assert.throws(()=>customers.createCustomer([],{...input,...change}));
});
test('new customer receives profile and common guides but no generated system log or completion',()=>{
 assert.ok(customers);const [c]=customers.createCustomer([],input);const ctx=getCase(c.id,'base','',c);const a=analyzeDemo(ctx);
 assert.equal(a.category,'insufficient');assert.ok(a.questions.length);
 assert.ok(!ctx.evidence.some(e=>e.type.includes('시스템')));
 assert.ok(ctx.evidence.filter(e=>e.customerId!==null).every(e=>e.customerId===c.id));
 assert.ok(!ctx.evidence.some(e=>e.id==='mono-log'));
 assert.throws(()=>getCase('mono','base','',{...c,id:'mono'}));
});
test('manual customer, associated task, notes and draft survive reload alongside old workspace',()=>{
 assert.ok(customers);const list=customers.createCustomer([],input);const c=list[0];
 const tasks=createTask([],{clientId:c.id,actionKey:'kickoff',title:'첫 목표 확인',owner:c.owner,due:c.target},list);
 const saved=restoreState(JSON.stringify({version:1,customers:list,tasks,activity:[],notes:{[c.id]:'고객 문의 확인 필요'},drafts:{[c.id]:'추가 확인 안내'}}));
 assert.equal(saved.recovered,false);assert.equal(saved.customers[0].id,c.id);assert.equal(saved.tasks[0].clientId,c.id);assert.equal(saved.notes[c.id],'고객 문의 확인 필요');assert.equal(saved.drafts[c.id],'추가 확인 안내');
 const old=restoreState(JSON.stringify({version:1,tasks:[],activity:[],notes:{mono:'기존 메모'},drafts:{mono:'기존 초안'}}));
 assert.equal(old.recovered,false);assert.deepEqual(old.customers,[]);assert.equal(old.drafts.mono,'기존 초안');
});
test('manual profile identity cannot spoof sample clients or persist fabricated telemetry',()=>{
 assert.ok(customers);const [c]=customers.createCustomer([],input);
 assert.throws(()=>customers.validateCustomer({...c,id:'mono'}));
 const verified=customers.validateCustomer({...c,completed:5,evidence:[{id:'mono-log'}],risk:true});
 assert.equal(verified.completed,0);assert.equal(verified.evidence,undefined);
});
