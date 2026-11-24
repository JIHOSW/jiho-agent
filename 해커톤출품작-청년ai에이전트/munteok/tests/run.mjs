// 터미널에서 엔진 테스트를 실행한다: node tests/run.mjs  (또는 npm test)
// 브라우저의 tests/index.html과 같은 테스트를 돌린다.
import fs from 'node:fs';
import { runTests } from './engine.test.js';

const rules = JSON.parse(fs.readFileSync(new URL('../data/rules.json', import.meta.url), 'utf8'));
const results = runTests(rules);
const failed = results.filter((r) => !r.pass);
console.log(`전체 ${results.length}건, 통과 ${results.length - failed.length}건, 실패 ${failed.length}건`);
for (const f of failed) console.log(`실패  ${f.name}\n  실제 ${JSON.stringify(f.actual)}\n  기대 ${JSON.stringify(f.expected)}`);
process.exit(failed.length ? 1 : 0);
