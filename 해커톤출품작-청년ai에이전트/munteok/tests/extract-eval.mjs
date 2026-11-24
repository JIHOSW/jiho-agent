// 배포된 AI 추출 서버를 가상 공고로 시험하고 기대값과 비교한다.
// 실행: node tests/extract-eval.mjs https://hankkeut-app.vercel.app
// 공고는 모두 지어낸 것이다. 실제 개인정보를 넣지 않는다. 호출할 때마다 API 크레딧이 조금 쓰인다.
import { SAMPLES } from '../js/samples.js';

const base = (process.argv[2] || 'https://hankkeut-app.vercel.app').replace(/\/$/, '');

// 샘플 3건은 화면의 가상 샘플과 같은 공고와 기대값을 쓴다.
const cases = SAMPLES.map((s) => ({
  name: s.title,
  text: s.text,
  expect: Object.fromEntries(Object.entries(s.extraction).filter(([k]) => k !== 'holidayIncluded').map(([k, v]) => [k, v.value])),
}));

// 표기 방식이 다른 가상 공고 5건을 더한다.
cases.push(
  {
    name: '월급만 적힌 공고',
    text: '[가상 샘플] 사무 보조 구함. 월~금 오전 9시~오후 1시, 월 1,100,000원, 4대보험 가입. 4월부터 12월까지.',
    expect: { hourlyWage: null, weeklyHours: 20, startMonth: 4, months: 9, incomeType: 'wage' },
    hourlyRange: [10000, 13000],
  },
  {
    name: '일당 공고',
    text: '[가상 샘플] 주말 물류센터 상하차, 토·일 09:00~18:00(휴게 1시간), 일당 100,000원 당일 지급, 6월 한 달.',
    expect: { hourlyWage: 12500, weeklyHours: 16, startMonth: 6, months: 1, incomeType: 'daily' },
  },
  {
    name: '프리랜서 공고',
    text: '[가상 샘플] 영상 자막 작업 프리랜서. 주 10시간 내외, 시간당 15,000원, 사업소득 3.3% 원천징수. 기간 협의.',
    expect: { hourlyWage: 15000, weeklyHours: 10, startMonth: null, months: null, incomeType: 'business' },
  },
  {
    name: '해를 넘기는 공고',
    text: '[가상 샘플] 스키장 렌탈샵 단기 알바. 월~금 09:00~18:00(휴게 1시간), 시급 11,000원, 4대보험 가입. 12월부터 3개월 근무.',
    // 올해 안의 달만 세는 일은 화면이 한다. AI는 공고에 적힌 3개월을 그대로 읽어야 한다.
    expect: { hourlyWage: 11000, weeklyHours: 40, startMonth: 12, months: 3, incomeType: 'wage' },
  },
  {
    name: '공고가 아닌 글',
    text: '오늘 점심 뭐 먹을지 추천해 주세요.',
    expectRejected: true,
  },
);

const keys = ['hourlyWage', 'weeklyHours', 'startMonth', 'months', 'incomeType'];
let fieldTotal = 0;
let fieldOk = 0;
let caseOk = 0;
for (const c of cases) {
  const started = Date.now();
  const res = await fetch(`${base}/api/extract`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: c.text }) });
  const data = await res.json().catch(() => ({}));
  const ms = Date.now() - started;
  if (c.expectRejected) {
    const ok = res.status === 422;
    caseOk += ok ? 1 : 0;
    console.log(`${ok ? '맞음' : '틀림'}  ${c.name}: ${res.status} ${data.error || ''} (${ms}ms)`);
    continue;
  }
  if (!res.ok) {
    console.log(`실패  ${c.name}: ${res.status} ${data.error || ''}`);
    fieldTotal += keys.length;
    continue;
  }
  const got = data.fields;
  const wrong = [];
  for (const k of keys) {
    fieldTotal += 1;
    let ok = got[k].value === c.expect[k];
    // 월급만 적힌 공고는 시급을 계산해야 하므로 범위로 본다.
    if (k === 'hourlyWage' && c.hourlyRange) ok = got[k].value >= c.hourlyRange[0] && got[k].value <= c.hourlyRange[1];
    // 기간이 정해지지 않은 공고는 "연말까지로 추정"도 허용한다.
    if (k === 'months' && c.expect[k] === null && got[k].status !== '확정') ok = true;
    if (ok) fieldOk += 1;
    else wrong.push(`${k}: ${JSON.stringify(got[k].value)} (기대 ${JSON.stringify(c.expect[k])}, ${got[k].status})`);
  }
  if (!wrong.length) caseOk += 1;
  console.log(`${wrong.length ? '틀림' : '맞음'}  ${c.name} (${ms}ms)${wrong.length ? '\n      ' + wrong.join('\n      ') : ''}`);
  console.log(`      ${keys.map((k) => `${k}=${JSON.stringify(got[k].value)}[${got[k].status}]`).join(' ')}`);
}
console.log(`\n항목 정확도 ${fieldOk}/${fieldTotal}, 공고 단위 ${caseOk}/${cases.length}`);
