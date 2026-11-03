import { readFileSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
const root = new URL('./dist/', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const offline = readFileSync(new URL('imarket-proposal.html', root), 'utf8');
const app = readFileSync(new URL('app.js', root), 'utf8');
assert.equal((html.match(/<section class="slide[ "]/g) || []).length, 10);
assert.equal((html.match(/<template class="note">/g) || []).length, 10);
assert.equal((html.match(/서비스 개발팀/g) || []).length, 3);
assert.equal((html.match(/김지호 대리/g) || []).length, 3);
const removedCaption = ['AI', '생성', '개념', '이미지'].join(' ');
assert(!html.toLowerCase().includes(removedCaption.toLowerCase()));
assert(!offline.toLowerCase().includes(removedCaption.toLowerCase()));
assert(!html.includes('<figcaption>'));
assert(!html.includes('class="practice"'));
assert(!html.includes('cover-panel glass tilt'));
assert(html.includes('src="assets/imarket-mro.jpg"'));
assert(!app.includes('function ripple'));
assert(!app.includes('motionCards'));
assert(!app.includes('pointermove'));
assert(html.includes('href="readability.css"'));
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (!/^https?:/.test(match[1])) assert(existsSync(new URL(match[1], root)), `Missing ${match[1]}`);
}
assert(!/<(?:script|link)[^>]+(?:src|href)="/.test(offline), 'Offline file has an external script/style');
assert(offline.includes('data:font/woff;base64,'));
assert(offline.includes('data:image/jpeg;base64,'));
assert(!/src="assets\//.test(offline));
const scripts = [...offline.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 2);
scripts.forEach(([_, code], i) => new Script(code, { filename: `offline-${i}.js` }));
new Script(app);
const model = app.match(/function valueModel\(spend, saving, orders\) \{([\s\S]*?)\n  \}/);
assert(model, 'Value formula must exist');
const calculate = new Function('spend', 'saving', 'orders', model[1]);
for (const [args, expected] of [[[100,3,10000],[3,.5]], [[200,5,30000],[10,1.5]], [[20,1,1000],[.2,.05]]]) {
  const result = calculate(...args);
  assert(Math.abs(result.cash - expected[0]) < 1e-10);
  assert(Math.abs(result.capacity - expected[1]) < 1e-10);
}
console.log('PASS: 10 slides, 10 notes, presenter in 3 places, caption removed, local assets, embedded scripts/font/image, 3 value scenarios.');
