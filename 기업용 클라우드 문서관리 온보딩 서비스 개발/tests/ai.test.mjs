import test from 'node:test';
import assert from 'node:assert/strict';
import {getCase,analyzeDemo} from '../lib/firstmile/domain.mjs';
import {createCustomer} from '../lib/firstmile/customers.mjs';
let ai;try{ai=await import('../lib/firstmile/ai.mjs');}catch{}
test('unconfigured API returns explicit setup error without making a request',async()=>{
 assert.ok(ai,'AI boundary missing'); const r=await ai.handleAnalysis({clientId:'mono'},{});assert.equal(r.status,503);assert.equal(r.body.code,'KEY_MISSING');
});
test('unknown client and oversized input are rejected before upstream access',async()=>{
 assert.ok(ai);assert.equal((await ai.handleAnalysis({clientId:'other'},{OPENAI_API_KEY:'test'})).status,400);
 assert.equal((await ai.handleAnalysis({clientId:'mono',note:'x'.repeat(2001)},{OPENAI_API_KEY:'test'})).status,400);
});
test('foreign or fabricated citations are rejected',()=>{
 assert.ok(ai);const c=getCase('mono');const out=analyzeDemo(c);out.facts[0].sourceIds=['flow-log'];
 assert.throws(()=>ai.validateAnalysis(out,c),/근거/);
});
test('AI timeout or provider failure never turns into a demo success',async()=>{
 assert.ok(ai);const r=await ai.handleAnalysis({clientId:'mono'},{OPENAI_API_KEY:'test'},async()=>new Response('{"error":"secret value"}',{status:401}));
 assert.equal(r.status,502);assert.equal(r.body.code,'AI_FAILED');assert.ok(!JSON.stringify(r).includes('secret value'));
});
test('Responses output is parsed, checked and marked live with usage',async()=>{
 assert.ok(ai);const result=analyzeDemo(getCase('mono'));delete result.mode;delete result.generatedAt;
 const r=await ai.handleAnalysis({clientId:'mono'},{OPENAI_API_KEY:'test',OPENAI_MODEL:'test-model'},async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');const b=JSON.parse(options.body);
  assert.equal(b.store,false);assert.equal(b.text.format.type,'json_schema');assert.ok(!JSON.stringify(b.input).includes('flow-log'));
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}],usage:{input_tokens:500,output_tokens:200}});
 });assert.equal(r.status,200);assert.equal(r.body.mode,'live');assert.equal(r.body.usage.inputTokens,500);
});
test('incomplete or malformed output is rejected as AI failure',async()=>{
 assert.ok(ai);const r=await ai.handleAnalysis({clientId:'mono'},{OPENAI_API_KEY:'test'},async()=>Response.json({status:'incomplete',output:[]}));assert.equal(r.status,502);
});
test('manual customer profile reaches AI setup boundary without any seeded private records',async()=>{
 const [customer]=createCustomer([],{name:'고객추가테스트',industry:'IT',owner:'담당자',users:5,startDate:'2026-11-04',target:'2026-11-20',goal:'문서 게시와 검색'});
 const ctx=getCase(customer.id,'base','',customer);const result=analyzeDemo(ctx);
 const r=await ai.handleAnalysis({clientId:customer.id,customCustomer:customer},{OPENAI_API_KEY:'test'},async(url,options)=>{
  const b=JSON.parse(options.body);assert.ok(!JSON.stringify(b.input).includes('mono-log'));
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}]});
 });assert.equal(r.status,200);assert.equal(r.body.category,'insufficient');
});
test('server rejects a submitted profile that attempts to override a seeded customer',async()=>{
 const r=await ai.handleAnalysis({clientId:'mono',customCustomer:{id:'mono',name:'override'}},{});
 assert.equal(r.status,400);
});
