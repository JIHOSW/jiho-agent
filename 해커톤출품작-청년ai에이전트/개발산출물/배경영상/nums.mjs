// scene.html의 숫자(카페 예시를 주 15·18·24시간으로 바꿔 계산한 값)를 계산 엔진으로 다시 낸다.
// 쓰는 법(이 폴더에서): node nums.mjs
import fs from 'node:fs';
const root = new URL('../../munteok/', import.meta.url);
const { evaluate } = await import(new URL('js/engine.js', root));
const { SAMPLES } = await import(new URL('js/samples.js', root));
const rules = JSON.parse(fs.readFileSync(new URL('data/rules.json', root), 'utf8'));
const s = SAMPLES.find((x) => x.id === 'cafe');
const f = Object.fromEntries(Object.entries(s.extraction).map(([k, v]) => [k, v.value]));
const base = { hourlyWage: f.hourlyWage, weeklyHours: f.weeklyHours, startMonth: f.startMonth || 1, months: f.months || 12, incomeType: f.incomeType, holidayIncluded: Boolean(f.holidayIncluded) };
// 앱(app.js splitMan)과 같은 방식으로 만 원 단위를 나눈다: 합이 버는 돈의 만 원 값과 맞게 큰 나머지부터 1씩 더한다.
function splitMan(values) {
  const total = Math.round(values.reduce((a, b) => a + b, 0) / 10000);
  const floors = values.map((v) => Math.floor(v / 10000));
  const order = values.map((v, i) => [v / 10000 - floors[i], i]).sort((a, b) => b[0] - a[0]);
  let left = total - floors.reduce((a, b) => a + b, 0);
  for (const [, i] of order) { if (left <= 0) break; floors[i] += 1; left -= 1; }
  return floors;
}
for (const h of [15, 18, 24]) {
  const r = evaluate({ ...base, weeklyHours: h }, s.profile, rules).summary;
  const deduct = r.insurance + r.withholding;
  const kept = Math.max(0, r.addedIncome - deduct - r.allowanceLoss);
  const [k, d, l] = splitMan([kept, deduct, r.allowanceLoss]);
  console.log(`주 ${h}시간: { gross: ${r.addedIncome}, ins: ${deduct}, loss: ${r.allowanceLoss}, net: ${r.net}, m: { gross: ${k + d + l}, ins: ${d}, loss: ${l}, net: ${k} } }`);
}
