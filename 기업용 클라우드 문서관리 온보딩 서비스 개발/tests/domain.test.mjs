import test from 'node:test';
import assert from 'node:assert/strict';
let domain;
try { domain = await import('../lib/firstmile/domain.mjs'); } catch {}
test('unpublished document is identified using customer records', () => {
  assert.ok(domain, 'domain implementation is missing');
  const a = domain.analyzeDemo(domain.getCase('mono', 'base'));
  assert.equal(a.category, 'configuration');
  assert.match(a.title, /게시/);
  assert.ok(a.evidenceIds.includes('mono-log'));
});
test('published but failed indexing produces a different next action', () => {
  assert.ok(domain); const a = domain.analyzeDemo(domain.getCase('mono', 'index-error'));
  assert.equal(a.category, 'technical'); assert.match(a.actions[0].title, /개발|기술/);
});
test('missing logs requests verification instead of asserting a cause', () => {
  assert.ok(domain); const a = domain.analyzeDemo(domain.getCase('mono', 'missing'));
  assert.equal(a.category, 'insufficient'); assert.ok(a.questions.length); assert.match(a.title, /확인/);
});
test('conflicting records do not pick an unverified cause', () => {
  assert.ok(domain); const a = domain.analyzeDemo(domain.getCase('mono', 'conflict'));
  assert.equal(a.category, 'conflict'); assert.ok(a.questions.length);
});
test('customer context cannot retrieve another customer private record', () => {
  assert.ok(domain); const c = domain.getCase('flow', 'base');
  assert.ok(c.evidence.every(e => e.customerId === 'flow' || e.customerId === null));
  assert.ok(!c.evidence.some(e => e.id === 'mono-log'));
  assert.throws(() => domain.getCase('nonexistent', 'base'));
});
test('task duplicate is blocked until previous task completes', () => {
  assert.ok(domain); const input={clientId:'mono',actionKey:'publish',title:'게시 확인',owner:'김서연',due:'2026-11-06'};
  const first=domain.createTask([],input); assert.equal(first.length,1);
  assert.equal(domain.createTask(first,input).length,1);
  assert.equal(domain.createTask([{...first[0],status:'done'}],input).length,2);
  assert.throws(()=>domain.createTask([],{...input,due:'2026-02-31'}));
});
test('corrupt persisted state recovers and valid tasks survive round trip', () => {
  assert.ok(domain); assert.equal(domain.restoreState('{bad').recovered,true);
  const tasks=domain.createTask([],{clientId:'mono',actionKey:'publish',title:'게시 확인',owner:'김서연',due:'2026-11-06'});
  const saved=domain.restoreState(JSON.stringify({version:1,tasks,activity:[],notes:{}}));
  assert.equal(saved.tasks[0].title,'게시 확인'); assert.equal(saved.recovered,false);
});
test('reanalyzed action with a different model key cannot duplicate an active title',()=>{
 const input={clientId:'mono',actionKey:'publish',title:'문서 게시 확인',owner:'김서연',due:'2026-11-06'};
 const first=domain.createTask([],input);
 assert.equal(domain.createTask(first,{...input,actionKey:'publish-document',title:' 문서  게시 확인! '}).length,1);
});
