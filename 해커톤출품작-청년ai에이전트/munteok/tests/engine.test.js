// 규칙 엔진 기대값 테스트
// 기대값은 엔진과 별개로 손으로 계산한 값이다. 규칙표(data/rules.json)의 수치가 바뀌면 함께 고친다.
import { monthlyPay, allowancePayment, allowanceLine, evaluate, dateSpan, searchAlternatives, compareOffers, employerQuestions, buildRequestMessage, forbiddenIn, REQUEST_ACTIONS, STATUS } from '../js/engine.js';

export function runTests(rules) {
  const results = [];
  const eq = (name, actual, expected) => {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    results.push({ name, pass, actual, expected });
  };
  const base = { age: 20, allowance: 'no', healthDependent: 'no', taxDependent: 'no', ytdIncome: { wage: 0, daily: 0, business: 0 }, otherSupports: [] };
  const card = (r, id) => r.cards.find((c) => c.id === id);

  // 1. 한 달 급여
  let p = monthlyPay({ hourlyWage: 10320, weeklyHours: 14, incomeType: 'wage' }, rules);
  eq('주 14시간: 기본급', p.base, 627766);
  eq('주 14시간: 주휴수당 없음', p.holidayPay, 0);
  eq('주 14시간: 4대보험 없음', p.insurance, 0);
  p = monthlyPay({ hourlyWage: 10320, weeklyHours: 16, incomeType: 'wage' }, rules);
  eq('주 16시간: 기본급', p.base, 717446);
  eq('주 16시간: 주휴수당', p.holidayPay, 143489);
  eq('주 16시간: 4대보험', p.insurance, 83660);
  p = monthlyPay({ hourlyWage: 10320, weeklyHours: 20, incomeType: 'wage' }, rules);
  eq('주 20시간: 월 급여 합계', p.gross, 1076170);
  eq('주 20시간: 실수령', p.takeHome, 971594);
  p = monthlyPay({ hourlyWage: 13000, weeklyHours: 12, incomeType: 'business' }, rules);
  eq('사업소득: 월 수입', p.gross, 677820);
  eq('사업소득: 3.3% 원천징수', p.withholding, 22368);
  eq('사업소득: 주휴수당 없음', p.holidayPay, 0);

  p = monthlyPay({ hourlyWage: 10320, weeklyHours: 16, incomeType: 'wage', holidayIncluded: true }, rules);
  eq('주휴 포함 시급: 주휴수당을 더하지 않음', [p.holidayPay, p.gross], [0, 717446]);
  eq('주휴 포함 시급: 4대보험은 공제', p.insurance, 69717);
  p = monthlyPay({ hourlyWage: 10320, weeklyHours: 14, incomeType: 'wage', holidayIncluded: true }, rules);
  eq('주 15시간 미만이면 주휴 포함 여부와 무관', [p.holidayPay, p.holidayIncluded], [0, false]);

  // 2. 구직촉진수당
  eq('수당 기준선', allowanceLine(rules), 1538543);
  eq('소득 90만 원: 전액', allowancePayment(900000, rules), 600000);
  eq('소득 938,543원: 전액(경계)', allowancePayment(938543, rules), 600000);
  eq('소득 120만 원: 감액', allowancePayment(1200000, rules), 338543);
  eq('소득 1,538,543원: 0원(경계)', allowancePayment(1538543, rules), 0);
  eq('소득 160만 원: 0원', allowancePayment(1600000, rules), 0);

  // 3. 시나리오 A: 수당 수급자, 시급 10,500원 주 24시간
  const jobA = { hourlyWage: 10500, weeklyHours: 24, startMonth: 1, months: 12, incomeType: 'wage' };
  const profA = { ...base, age: 27, allowance: 'yes' };
  let r = evaluate(jobA, profA, rules);
  eq('A: 월 급여', r.pay.gross, 1313928);
  eq('A: 받는 수당', card(r, 'jobSeekerAllowance').paid, 224615);
  eq('A: 줄어드는 수당', r.summary.allowanceLoss, 375385);
  // 2026-11-20: 감액 계산식(시행령 제9조의2)과 중위소득 고시를 원문으로 확인해 확정으로 올림
  eq('A: 수당 카드 등급', card(r, 'jobSeekerAllowance').status, STATUS.CONFIRMED);
  eq('A: 해당 없는 제도 2개', r.notApplicable.map((c) => c.id), ['dependentDeduction', 'healthDependent']);
  eq('A: 주 15시간은 급여 증가로 구분', card(r, 'weekly15h').effect.type, 'gain');
  eq('A: 수당은 감소로 구분', card(r, 'jobSeekerAllowance').effect.type, 'loss');
  eq('A: 불리하거나 확인할 변화는 수당뿐', r.summary.adverseIds, ['jobSeekerAllowance']);
  eq('A: 소득 신고 필요', r.summary.reportNeeded, true);
  // 주당 최대 20시간만 가능한 경우: 그 범위 안에서만 비교한다

  // 3-1. 근무조건 비교: 받은 제안, 가능한 최대, 변화 지점
  const alt = searchAlternatives(jobA, profA, rules, { maxHours: 28 });
  eq('비교 기준: 받은 제안과 가능한 최대', alt.options.map((o) => o.kind + o.weeklyHours), ['original24', 'max28']);
  eq('비교 기준: 계산 횟수', alt.trace.evaluated, 28);
  const cpAt = (a, h) => a.changePoints.find((c) => c.weeklyHours === h);
  // 주 14시간은 한 달 약 61시간이라 4대보험 대상인지 확인이 필요한 경계(월 60시간 기준)
  eq('변화 지점: 주 14시간(확인 필요), 15시간, 18시간', alt.changePoints.map((c) => c.weeklyHours), [14, 15, 18]);
  eq('변화 지점 14시간: 4대보험 경계 확인', cpAt(alt, 14).changes.map((c) => c.type), ['pending']);
  eq('변화 지점 15시간: 주휴수당', cpAt(alt, 15).changes.map((c) => c.type), ['gain']);
  eq('변화 지점 18시간: 수당이 줄기 시작', [cpAt(alt, 18).changes[0].type, cpAt(alt, 18).allowanceLoss], ['loss', 46903]);
  eq('변화 지점 18시간: 확정 규칙이라 (추정) 표시 없음', cpAt(alt, 18).changes[0].text, '구직촉진수당이 줄기 시작함');
  eq('알아 둘 구간: 주 19~28시간', [alt.dip.peakHours, alt.dip.from, alt.dip.to, alt.dip.recoverHours], [18, 19, 28, null]);
  const alt40 = searchAlternatives(jobA, profA, rules, { maxHours: 40 });
  eq('40시간까지: 수당이 끊기는 지점과 취업 종료 지점 포함', alt40.changePoints.map((c) => c.weeklyHours), [14, 15, 18, 29, 30]);
  eq('40시간까지: 30시간은 취업으로 보아 수당 종료', cpAt(alt40, 30).changes.map((c) => c.text), ['취업으로 보아 구직촉진수당 지급이 끝남']);
  eq('40시간까지: 다시 커지는 시간', alt40.dip.recoverHours, 30);
  // 가장 많이 남는 시간은 줄어드는 구간 직전의 봉우리(18시간)가 아니라 할 수 있는 시간 전체에서 고른다.
  //   주 18시간: 985,446 − 보험료 95,760 − 수당 46,903 = 842,783원
  //   주 30시간: 급여 1,368,675 + 주휴 273,735 = 1,642,410원 − 보험료 159,600 − 수당 600,000(취업으로 끝남) = 882,810원
  const alt30 = searchAlternatives(jobA, profA, rules, { maxHours: 30 });
  eq('가장 많이 남는 시간: 30시간까지면 18시간이 아니라 30시간', [alt30.best, alt30.dip.peakHours, alt30.dip.to], [{ weeklyHours: 30, net: 882810 }, 18, 29]);
  eq('가장 많이 남는 시간: 28시간까지면 봉우리 18시간이 전체에서도 가장 많음', alt.best, { weeklyHours: 18, net: 842783 });
  // 부모 공제(20세, 근로소득): 주 9시간이면 10,500×9×4.345×12 = 4,927,230원, 주 10시간이면 5,474,700원으로 총급여 500만 원을 넘음
  const altDep = searchAlternatives(jobA, { ...base, age: 20, taxDependent: 'yes' }, rules, { maxHours: 12 });
  eq('달라지는 지점: 연간 기준을 넘는 시간과 문구', altDep.changePoints.map((c) => [c.weeklyHours, c.changes.map((x) => x.text)]), [[10, ['부모 연말정산 부양가족 공제: 연간 기준을 넘음']]]);
  const alt20 = searchAlternatives(jobA, profA, rules, { maxHours: 20 });
  eq('최대 20시간: 받은 제안(24시간)은 범위 밖', [alt20.offeredOutOfRange, alt20.options.map((o) => o.kind)], [true, ['max']]);
  const altSame = searchAlternatives(jobA, profA, rules, { maxHours: 24 });
  eq('받은 제안이 가능한 최대와 같으면 카드 하나', altSame.options.map((o) => o.kind), ['original']);
  const altPlain = searchAlternatives({ ...jobA, weeklyHours: 10 }, { ...base }, rules, { maxHours: 20 });
  eq('수당이 없으면 변화 지점은 주 14시간(확인)과 15시간뿐, 줄어드는 구간 없음', [altPlain.changePoints.map((c) => c.weeklyHours), altPlain.dip], [[14, 15], null]);
  // 받은 제안이 소수 시간(주 13.5시간)이면 반올림한 14시간이 아니라 13.5시간 그대로를 받은 제안으로 본다.
  const job135 = { ...jobA, weeklyHours: 13.5 };
  const alt135 = searchAlternatives(job135, base, rules, { maxHours: 40 });
  const row135 = alt135.table.find((t) => t.weeklyHours === 13.5);
  eq('소수 시간: 받은 제안은 13.5시간, 남는 돈은 결과와 같음', [alt135.offered, alt135.offeredOutOfRange, row135 && row135.net, alt135.options[0].kind + alt135.options[0].weeklyHours], [13.5, false, evaluate(job135, base, rules).summary.net, 'original13.5']);
  eq('소수 시간: 1~40시간에 13.5시간 한 줄을 더해 41줄, 순서대로', [alt135.table.length, alt135.table.slice(12, 15).map((t) => t.weeklyHours)], [41, [13, 13.5, 14]]);
  // 14.5시간은 15시간 미만이라 주휴수당이 없다. 반올림하면 15시간이 되어 주휴수당이 붙던 것을 막는다.
  const alt145 = searchAlternatives({ ...jobA, weeklyHours: 14.5 }, base, rules, { maxHours: 40 });
  eq('소수 시간: 14.5시간은 주휴수당 없음, 15시간부터 생김', [alt145.table.find((t) => t.weeklyHours === 14.5).over15, alt145.changePoints.find((c) => c.changes.some((x) => x.type === 'gain')).weeklyHours], [false, 15]);
  eq('소수 시간: 가능한 최대보다 길면 범위 밖', searchAlternatives({ ...jobA, weeklyHours: 20.5 }, base, rules, { maxHours: 20 }).offeredOutOfRange, true);

  // 3-2. 요청 문구
  const qs = ['주휴수당은 시급과 별도로 지급되나요?'];
  let msg = buildRequestMessage('expand', { offeredHours: 24, targetHours: 28, questions: qs });
  eq('문구: 근무 확대', msg.includes('주 28시간 정도로 늘릴 수 있을까요?'), true);
  eq('문구: 확인 질문 포함', msg.includes('- 주휴수당은 시급과 별도로 지급되나요?'), true);
  msg = buildRequestMessage('adjust', { offeredHours: 24, targetHours: 17, questions: [] });
  eq('문구: 조정 요청은 지원 기준을 이유로 쓰지 않음', [msg.includes('제 사정상'), msg.includes('수당'), msg.includes('지원')], [true, false, false]);
  eq('문구: 기간 질문이 이미 있으면 다시 묻지 않음', buildRequestMessage('terms', { offeredHours: 10, targetHours: 10, questions: ['근무는 언제부터 언제까지인가요?'] }).includes('근무 시작일과 기간도'), false);
  const allMsgs = Object.keys(REQUEST_ACTIONS).map((k) => buildRequestMessage(k, { offeredHours: 24, targetHours: 28, questions: employerQuestions(jobA, {}, rules) }));
  eq('문구: 네 가지 행동 모두 금지 표현 없음', allMsgs.map((m) => forbiddenIn(m).length), [0, 0, 0, 0]);
  eq('금지 표현 검사가 실제로 잡아냄', forbiddenIn('현금으로 주시면 신고 안 해도 됩니다'), ['신고 안', '현금으로']);

  // 4. 부모 공제: 시급 10,320원 주 14시간, 1월 시작
  const jobD = { hourlyWage: 10320, weeklyHours: 14, startMonth: 1, months: 12, incomeType: 'wage' };
  r = evaluate(jobD, { ...base, taxDependent: 'yes' }, rules);
  let d = card(r, 'dependentDeduction');
  eq('부모 공제: 넘음', d.crossed, true);
  eq('부모 공제: 8월에 넘음', d.crossMonth, 8);
  eq('부모 공제: 등급 확정', d.status, STATUS.CONFIRMED);
  eq('부모 공제: 개정안은 12월', d.proposed.crossMonth, 12);
  eq('부모 공제: 부모 세금 금액은 계산하지 않음', d.impact, undefined);
  eq('부모 공제: 자격 변동 확인으로 구분', d.effect.type, 'check');
  r = evaluate({ ...jobD, months: 7 }, { ...base, taxDependent: 'yes' }, rules);
  eq('부모 공제: 7개월만 일하면 넘지 않음', card(r, 'dependentDeduction').crossed, false);
  r = evaluate(jobD, { ...base, taxDependent: 'yes', ytdIncome: { wage: 3000000, daily: 0, business: 0 } }, rules);
  eq('부모 공제: 이미 번 300만 원이 있으면 4월', card(r, 'dependentDeduction').crossMonth, 4);

  // 5. 시나리오 B: 3.3% 사업소득, 3월 시작 10개월
  const jobB = { hourlyWage: 13000, weeklyHours: 12, startMonth: 3, months: 10, incomeType: 'business' };
  r = evaluate(jobB, { ...base, taxDependent: 'yes', healthDependent: 'yes' }, rules);
  d = card(r, 'dependentDeduction');
  eq('B 부모 공제: 확인 전 규칙이라 판정하지 않음', [d.crossed, d.pending, d.effect.type], [null, true, 'pending']);
  eq('B 부모 공제: 수입이 기준을 넘는 달은 확인 항목에 적음', d.checks[0].includes('4월'), true);
  eq('B 부모 공제: 확인 필요', d.status, STATUS.CHECK);
  const h = card(r, 'healthDependent');
  eq('B 피부양자: 확인 전 규칙이라 판정하지 않음', [h.crossed, h.pending, h.effect.type], [null, true, 'pending']);
  eq('B 피부양자: 수입이 기준을 넘는 달은 확인 항목에 적음', h.checks[0].includes('10월'), true);
  eq('B: 판정하지 못한 카드는 불리한 변화로 세지 않음', [r.summary.adverseIds, r.summary.pendingIds], [[], ['dependentDeduction', 'healthDependent']]);
  eq('B: 추가 확인 항목 2개', r.checks.length, 2);
  eq('B: 3.3% 소득은 5월 종합소득세 신고 안내', r.summary.reports, ['3.3% 소득: 다음 해 5월 종합소득세 신고']);
  eq('B: 3.3%는 추정 항목으로 분리', [r.summary.confirmedNet, r.summary.estimatedParts.map((x) => x.amount)], [677820, [-22368]]);
  eq('B: 주 15시간 카드는 해당 없음', r.notApplicable.map((c) => c.id), ['jobSeekerAllowance', 'weekly15h']);


  // 5-1. 제안 두 개 비교: 카페(A)와 학원 보조(B), 수당 수급자
  const cmp = compareOffers([
    { name: '카페', job: jobA, meta: { hourlyWage: '확정', weeklyHours: '추정', startMonth: '확정', months: '추정', incomeType: '확정' } },
    { name: '학원', job: jobB, meta: { hourlyWage: '확정', weeklyHours: '추정', startMonth: '확정', months: '확정', incomeType: '확정' } },
  ], profA, rules, { maxHours: 20 });
  eq('비교: 월 예상 추가수입', cmp.rows.map((x) => x.net), [810863, 655452]);
  eq('비교: 시간당 예상 추가수입', cmp.rows.map((x) => x.netPerHour), [7776, 12571]);
  eq('비교: 일하는 기간 전체', cmp.rows.map((x) => x.periodNet), [9730356, 6554520]);
  eq('비교: 카페가 가능한 시간을 넘으면 표시는 학원에만', [cmp.highlights.net, cmp.highlights.netPerHour], [1, 1]);
  const cmp40 = compareOffers([{ name: '카페', job: jobA, meta: {} }, { name: '학원', job: jobB, meta: {} }], profA, rules, { maxHours: 40 });
  eq('비교: 둘 다 가능하면 월 금액은 카페, 시간당은 학원', [cmp40.highlights.net, cmp40.highlights.netPerHour], [0, 1]);
  const cmp5 = compareOffers([{ name: '카페', job: jobA, meta: {} }], profA, rules, { maxHours: 5 });
  eq('비교: 가능한 제안이 없으면 표시 없음', cmp5.highlights.net, -1);
  eq('비교: 확인 안 된 항목이 적은 쪽은 학원', cmp.highlights.fewestUnsure, 1);
  eq('비교: 카페는 가능한 시간(20시간)을 넘음', cmp.rows.map((x) => x.withinHours), [false, true]);
  eq('비교: 학원은 수당이 줄지 않음', cmp.rows[1].allowanceLoss, 0);
  eq('고용주 질문: 카페 3개', cmp.rows[0].questions.length, 3);
  eq('고용주 질문: 주휴수당 지급 방식이 확정이면 묻지 않음', employerQuestions(jobA, { holidayIncluded: '확정' }, rules), []);
  eq('고용주 질문: 학원은 계약 형태와 근무시간', cmp.rows[1].questions, ['근로계약서를 쓰나요, 용역(프리랜서) 계약인가요?', '주당 근무시간과 휴게시간이 정확히 어떻게 되나요?']);
  eq('고용주 질문: 소득 종류를 모르면 지급 방식부터', employerQuestions({ incomeType: 'unknown', weeklyHours: 10 }, {}, rules), ['급여에서 4대보험을 떼나요, 3.3%를 떼나요?']);

  // 6. 피부양자: 주 15시간 이상 근로소득
  r = evaluate({ hourlyWage: 10320, weeklyHours: 16, startMonth: 1, months: 12, incomeType: 'wage' }, { ...base, healthDependent: 'yes' }, rules);
  // 2026-11-20: 직장가입자 기준(한 달 소정근로시간 60시간, 국민건강보험법 시행령 제9조)을 원문으로 확인해 확정으로 올림
  eq('피부양자: 주 16시간이면 직장가입자가 되어 빠짐', [card(r, 'healthDependent').crossed, card(r, 'healthDependent').status, card(r, 'healthDependent').checks.length], [true, STATUS.CONFIRMED, 0]);
  eq('피부양자: 자격 변동은 확인할 변화로 셈', r.summary.adverseIds, ['healthDependent']);
  const unverified = JSON.parse(JSON.stringify(rules));
  unverified.healthDependent.employeeConversion.verification = 'unverified';
  r = evaluate({ hourlyWage: 10320, weeklyHours: 16, startMonth: 1, months: 12, incomeType: 'wage' }, { ...base, healthDependent: 'yes' }, unverified);
  eq('피부양자: 규칙을 확인 전으로 내리면 판정에 쓰지 않음', [card(r, 'healthDependent').crossed, r.summary.adverseIds], [false, []]);
  r = evaluate(jobD, { ...base, healthDependent: 'yes' }, rules);
  eq('피부양자: 주 14시간은 소득 기준을 넘지 않음', card(r, 'healthDependent').crossed, false);
  eq('피부양자: 주 14시간은 직장가입자 여부 확인 항목', card(r, 'healthDependent').checks.length, 1);

  // 7. 소득 종류 모름, 범위 밖 제도, 최저임금
  r = evaluate({ hourlyWage: 11000, weeklyHours: 16, startMonth: 1, months: 12, incomeType: 'unknown' }, { ...base, taxDependent: 'yes', healthDependent: 'yes', allowance: 'yes', otherSupports: ['youthRent', 'nothing'] }, rules);
  eq('모름: 모든 카드가 확인 필요', r.cards.map((c) => c.status), [STATUS.CHECK, STATUS.CHECK, STATUS.CHECK, STATUS.CHECK]);
  eq('모름: 부모 공제 판단 보류', card(r, 'dependentDeduction').crossed, null);
  eq('범위 밖 제도 1개 안내', r.outOfScope.map((o) => o.title), ['청년월세지원']);
  r = evaluate({ hourlyWage: 9860, weeklyHours: 10, startMonth: 1, months: 3, incomeType: 'wage' }, base, rules);
  eq('최저임금 미달 경고', r.warnings.length, 1);
  r = evaluate(jobD, base, rules);
  eq('해당 제도가 없으면 주 15시간 카드만', r.cards.map((c) => c.id), ['weekly15h']);
  eq('넘는 기준선 없음', r.summary.crossedIds, []);
  // 3개월 이상 일하면 주 15시간 미만이어도 고용보험 가입(고용보험법 시행령 제3조)
  eq('주 14시간 12개월: 고용보험 가입', [card(r, 'weekly15h').effect.type, card(r, 'weekly15h').effect.label], ['note', '고용보험 가입']);
  r = evaluate({ ...jobD, weeklyHours: 10, months: 2 }, base, rules);
  eq('주 10시간 2개월: 변화 없음', card(r, 'weekly15h').effect.type, 'keep');
  r = evaluate(jobD, base, rules);
  eq('수당이 없으면 신고 안내 없음', r.summary.reportNeeded, false);

  // 사례 A. 일용근로: 확인 전 규칙이 "자격 유지"를 만들면 안 된다
  r = evaluate({ hourlyWage: 12000, weeklyHours: 30, startMonth: 1, months: 12, incomeType: 'daily' }, { ...base, taxDependent: 'yes' }, rules);
  d = card(r, 'dependentDeduction');
  eq('일용 소득: 연 1,877만 원', r.timeline.rows[11].cumulative.daily, 18770400);
  eq('일용 소득: 부모 공제는 판정하지 않음', [d.crossed, d.pending, d.effect.label], [null, true, '추가 확인 필요']);
  eq('일용 소득: 개정안 기준도 판정하지 않음', d.proposed.crossed, null);
  eq('일용 소득: 확인 항목 1개', r.checks.length, 1);

  // 사례 B. 금액 분리: 큰 숫자는 확정 항목만
  r = evaluate(jobA, profA, rules);
  // 2026-11-20: 4대보험 요율과 수당 계산식을 원문으로 확인해 모두 확정 항목이 됨
  eq('금액 분리: 모두 확정이면 큰 숫자가 최종 금액', r.summary.confirmedNet, 810863);
  eq('금액 분리: 추정 항목 없음', r.summary.estimatedParts, []);
  eq('금액 분리: 추정까지 반영하면 기존 값과 같음', r.summary.net, 810863);
  eq('수당 수급자: 신청할 때마다 소득 신고 안내', r.summary.reports, ['구직촉진수당: 수당을 신청할 때마다 번 돈을 신고']);
  eq('수당 수급 중 주 24시간: 자격 확인 항목 없음', r.checks.length, 0);
  r = evaluate({ ...jobA, weeklyHours: 30 }, profA, rules);
  // 주 30시간 이상 취업은 수당 감액이 아니라 지급 종료(시행규칙 제20조)
  eq('수당 수급 중 주 30시간: 수당 종료', [card(r, 'jobSeekerAllowance').ended, card(r, 'jobSeekerAllowance').paid, card(r, 'jobSeekerAllowance').effect.label], [true, 0, '수당 종료']);
  eq('수당 수급 중 주 30시간: 취업 신고 안내', r.summary.reports, ['구직촉진수당: 취업 사실을 고용센터에 신고']);
  r = evaluate({ ...jobA, weeklyHours: 30, incomeType: 'daily' }, profA, rules);
  eq('일용근로는 주 30시간이어도 종료로 보지 않음', card(r, 'jobSeekerAllowance').ended, false);
  r = evaluate(jobD, base, rules);
  eq('해당 카드가 없으면 제외 항목도 줄어듦', r.summary.excluded, ['소득세', '교통비·식비 등 개인 지출']);

  // 7-1. 2026-11-20 원문 확인으로 추가한 규칙
  p = monthlyPay({ hourlyWage: 10320, weeklyHours: 14, incomeType: 'wage', months: 3 }, rules);
  eq('주 14시간 3개월: 고용보험만 공제', [p.insurance, p.healthPension, p.employmentIns], [5650, false, true]);
  p = monthlyPay({ hourlyWage: 10320, weeklyHours: 14, incomeType: 'wage', months: 2 }, rules);
  eq('주 14시간 2개월: 4대보험 없음', p.insurance, 0);
  eq('주 14시간: 한 달 60시간 경계', p.insuranceBoundary, true);
  eq('주 13시간: 경계 아님', monthlyPay({ hourlyWage: 10320, weeklyHours: 13, incomeType: 'wage' }, rules).insuranceBoundary, false);
  r = evaluate(jobD, { ...base, age: 21, taxDependent: 'yes' }, rules);
  eq('부모 공제: 21세는 해당 없음', r.notApplicable.map((c) => c.id).includes('dependentDeduction'), true);
  r = evaluate(jobD, { ...base, age: 20, taxDependent: 'yes' }, rules);
  eq('부모 공제: 20세는 계산함', r.cards.map((c) => c.id).includes('dependentDeduction'), true);

  // 7-2. 수당이 끝나는 달과 달마다 늘어나는 돈
  r = evaluate(jobA, { ...profA, allowanceEndMonth: 6 }, rules);
  eq('수당 6월까지: 구간 두 개', r.summary.periods.map((x) => [x.from, x.to, x.net]), [[1, 6, 810863], [7, 12, 1186248]]);
  eq('수당 6월까지: 첫 달 기준 금액은 그대로', [r.summary.net, r.summary.allowanceLoss], [810863, 375385]);
  eq('수당 6월까지: 올해 합계', r.summary.periodNet, 810863 * 6 + 1186248 * 6);
  eq('수당 6월까지: 끝나는 달 안내', card(r, 'jobSeekerAllowance').notes.some((n) => n.includes('7월부터')), true);
  r = evaluate({ ...jobA, startMonth: 8, months: 5 }, { ...profA, allowanceEndMonth: 6 }, rules);
  eq('일 시작 전에 수당이 끝나면 줄어드는 수당 없음', [card(r, 'jobSeekerAllowance').beforeStart, r.summary.allowanceLoss, r.summary.reports], [true, 0, []]);
  r = evaluate(jobA, { ...profA, allowanceEndMonth: 'unknown' }, rules);
  eq('끝나는 달을 모르면 계속 받는다고 보고 확인 항목', [r.summary.periods.length, r.checks.map((c) => c.cardId)], [1, ['jobSeekerAllowance']]);
  r = evaluate(jobA, { ...profA, otherSupports: ['unemploymentBenefit'], unemploymentEndMonth: 2 }, rules);
  eq('실업급여: 끝나는 달 안내', r.outOfScope[0].note.startsWith('2월에 끝나면'), true);
  eq('실업급여와 구직촉진수당을 함께 받으면 경고', r.warnings.some((w) => w.includes('시행규칙 제20조')), true);
  const cmpEnd = compareOffers([{ name: '카페', job: jobA, meta: {} }], { ...profA, allowanceEndMonth: 6 }, rules, { maxHours: 40 });
  eq('제안 비교: 기간 합계는 달별 합', cmpEnd.rows[0].periodNet, 810863 * 6 + 1186248 * 6);

  // 8. 연도 범위: 해를 넘기는 기간과 다음 해 최저임금 안내
  r = evaluate({ hourlyWage: 10500, weeklyHours: 10, startMonth: 11, months: 6, incomeType: 'wage' }, base, rules);
  eq('11월부터 6개월: 올해 2개월만 계산', [r.timeline.countedMonths, r.timeline.uncountedMonths], [2, 4]);
  eq('11월부터 6개월: 12월 누적은 2개월치', r.timeline.rows[11].cumulative.wage, 2 * r.pay.gross);
  eq('해를 넘기면 안내 3개(연도, 빠진 기간, 다음 해 최저임금)', r.notices.length, 3);
  r = evaluate({ hourlyWage: 11000, weeklyHours: 10, startMonth: 3, months: 10, incomeType: 'wage' }, base, rules);
  eq('해를 넘기지 않고 시급이 충분하면 연도 안내만', [r.timeline.uncountedMonths, r.notices.length], [0, 1]);
  r = evaluate({ hourlyWage: 9860, weeklyHours: 10, startMonth: 1, months: 3, incomeType: 'wage' }, base, rules);
  eq('올해 최저임금 미달이면 경고만, 다음 해 안내는 생략', [r.warnings.length, r.notices.length], [1, 1]);

  // 9. 기간을 일수로 넣은 짧은 일 (한 달보다 짧음)
  // 20일, 주 40시간, 시급 12,000원: 기본급 12,000×40×20/7 = 1,371,429원, 주휴수당은 다 채운 2주만 12,000×8×2 = 192,000원
  p = monthlyPay({ hourlyWage: 12000, weeklyHours: 40, incomeType: 'wage', days: 20 }, rules);
  eq('20일: 기본급', p.base, 1371429);
  eq('20일: 주휴수당은 다 채운 주만', p.holidayPay, 192000);
  eq('20일: 4대보험 (1,563,429 × 9.7174%)', p.insurance, 151925);
  const jobShort = { hourlyWage: 12000, weeklyHours: 40, startMonth: 3, days: 20, incomeType: 'wage' };
  r = evaluate(jobShort, { ...base, allowance: 'yes' }, rules);
  // 그 달 소득 1,563,429원이 기준선 1,538,543원을 넘어 그 달 수당은 0원. 한 달이 안 되는 일이라 "수당 종료"로 단정하지 않는다.
  eq('20일: 그 달 수당 0원, 종료로 단정하지 않음', [card(r, 'jobSeekerAllowance').paid, card(r, 'jobSeekerAllowance').ended, r.summary.allowanceLoss], [0, false, 600000]);
  eq('20일: 취업으로 보는지 확인 항목', card(r, 'jobSeekerAllowance').checks.some((t) => t.includes('20일만 일하는 일')), true);
  eq('20일: 늘어나는 돈 (1,563,429 − 151,925 − 600,000)', r.summary.net, 811504);
  eq('20일: 시작하는 달에만 소득', [r.timeline.start, r.timeline.end, r.summary.months.length, r.summary.days], [3, 3, 1, 20]);
  // 5일, 주 20시간, 시급 10,320원: 10,320×20×5/7 = 147,429원, 한 주를 다 채우지 않아 주휴수당 없음
  const job5 = { hourlyWage: 10320, weeklyHours: 20, startMonth: 7, days: 5, incomeType: 'wage' };
  r = evaluate(job5, { ...base, healthDependent: 'yes' }, rules);
  eq('5일: 급여와 주휴수당', [r.pay.base, r.pay.holidayPay, r.pay.insurance], [147429, 0, 14326]);
  eq('5일: 7월에만 소득', [r.timeline.rows[6].income, r.timeline.rows[7].income, r.timeline.rows[11].cumulative.total], [147429, 0, 147429]);
  eq('5일: 주휴수당을 넣지 않았다고 밝힘', card(r, 'weekly15h').headline.includes('주휴수당은 넣지 않음'), true);
  eq('5일: 4대보험은 어림값으로 표시', r.summary.parts.find((x) => x.label === '4대보험 근로자 부담분').status, STATUS.ESTIMATED);
  eq('5일: 직장가입자 전환은 판정하지 않고 확인 항목', [card(r, 'healthDependent').crossed, card(r, 'healthDependent').checks.some((t) => t.includes('5일 동안만'))], [false, true]);
  eq('5일: 계산 전제 안내', r.notices.some((n) => n.includes('5일 동안 일하고')), true);
  const cmpShort = compareOffers([{ name: '단기', job: job5, meta: {} }], base, rules, { maxHours: 40 });
  // 늘어나는 돈 133,103원 ÷ 일한 시간 (20×5/7 = 14.29시간)
  eq('5일: 비교의 시간당 금액은 그 기간 일한 시간으로 나눔', [cmpShort.rows[0].days, cmpShort.rows[0].net, cmpShort.rows[0].netPerHour], [5, 133103, 9317]);
  eq('일수가 범위를 벗어나면 개월로 계산', monthlyPay({ hourlyWage: 10320, weeklyHours: 20, incomeType: 'wage', days: 40 }, rules).gross, 1076170);

  // 10. 시작일~끝나는 날로 넣은 기간 (달마다 나눠 계산하고 금액은 기간 합계)
  // 3월 25일~4월 10일(17일), 주 20시간, 시급 12,000원, 요일 모름
  //   3월 7일: 12,000×20×7/7 = 240,000원, 4월 10일: 12,000×20×10/7 = 342,857원
  //   주휴수당(주 4시간 = 48,000원)은 다 채운 주가 끝나는 날의 달에: 3/25~3/31 → 3월, 4/1~4/7 → 4월
  //   4대보험(9.7174%): 3월 288,000 → 27,986원, 4월 390,857 → 37,981원
  const jobSpan = { hourlyWage: 12000, weeklyHours: 20, startDate: '2026-03-25', endDate: '2026-04-10', incomeType: 'wage' };
  r = evaluate(jobSpan, base, rules);
  eq('날짜: 달마다 나눈 급여', r.summary.months.map((x) => [x.month, x.gross]), [[3, 288000], [4, 390857]]);
  eq('날짜: 기간 합계 (버는 돈, 보험료, 늘어나는 돈)', [r.summary.addedIncome, r.summary.insurance, r.summary.net], [678857, 65967, 612890]);
  eq('날짜: 기간 이름과 한 달 미만 판단', [r.summary.span.label, r.pay.shortJobDays], ['3월 25일~4월 10일', 17]);
  eq('날짜: 한 달 미만이면 4대보험은 어림값', r.summary.parts.find((x) => x.label === '4대보험 근로자 부담분').status, STATUS.ESTIMATED);
  eq('날짜: 연간 표에 3·4월만 소득', [r.timeline.rows[2].income, r.timeline.rows[3].income, r.timeline.rows[4].income], [288000, 390857, 0]);
  // 월~금, 3월 2일(월)~3월 13일(금): 근무일 10일 × 하루 4시간(주 20시간 ÷ 5일) = 40시간 → 480,000원
  //   다 채운 주는 3/2~3/8 한 주 → 주휴수당 48,000원, 4대보험 528,000 × 9.7174% = 51,308원
  const jobWeek = { hourlyWage: 12000, weeklyHours: 20, startDate: '2026-03-02', endDate: '2026-03-13', workDays: [1, 2, 3, 4, 5], incomeType: 'wage' };
  r = evaluate(jobWeek, base, rules);
  eq('요일: 실제 근무일로 계산', [r.pay.base, r.pay.holidayPay, r.pay.gross, r.pay.insurance], [480000, 48000, 528000, 51308]);
  const cmpWeek = compareOffers([{ name: '요일', job: jobWeek, meta: {} }], base, rules, { maxHours: 40 });
  // 늘어나는 돈 476,692원 ÷ 일한 시간 40시간
  eq('요일: 비교의 시간당 금액은 실제 일한 시간으로 나눔', [cmpWeek.rows[0].net, cmpWeek.rows[0].netPerHour], [476692, 11917]);
  eq('요일: 근무시간 바꿔 보기의 같은 시간 값은 결과와 같음', searchAlternatives(jobWeek, { ...base, maxHours: 20 }, rules, { maxHours: 20 }).table.find((t) => t.weeklyHours === 20).net, 476692);
  // 3월 1일~5월 31일, 주 24시간, 수당 받는 중: 주휴수당 주 4.8시간 = 57,600원, 다 채운 주 3월 4·4월 4·5월 5
  //   3월 1,275,429 + 230,400 = 1,505,829원 → 수당 1,538,543 − 1,505,829 = 32,714원 (567,286원 줄어듦)
  //   4월 1,234,286 + 230,400 = 1,464,686원 → 수당 73,857원 (526,143원 줄어듦)
  //   5월 1,275,429 + 288,000 = 1,563,429원 → 수당 0원 (600,000원 줄어듦)
  const jobLong = { hourlyWage: 12000, weeklyHours: 24, startDate: '2026-03-01', endDate: '2026-05-31', incomeType: 'wage' };
  r = evaluate(jobLong, { ...base, allowance: 'yes' }, rules);
  eq('날짜 3개월: 달마다 받는 수당', r.summary.months.map((x) => [x.month, x.gross, x.allowancePaid]), [[3, 1505829, 32714], [4, 1464686, 73857], [5, 1563429, 0]]);
  eq('날짜 3개월: 줄어드는 수당 합계와 늘어나는 돈', [r.summary.allowanceLoss, r.summary.net, card(r, 'jobSeekerAllowance').ended], [1693429, 2399934, false]);
  r = evaluate(jobLong, { ...base, allowance: 'yes', allowanceEndMonth: 4 }, rules);
  eq('날짜 3개월: 4월에 수당이 끝나면 5월은 줄어들 수당 없음', [r.summary.allowanceLoss, r.summary.net, r.summary.months[2].allowancePaid], [1093429, 2999934, null]);
  // 주 10시간, 3월 1일~5월 31일: 3개월 이상이라 고용보험만 (0.9%): 4,783 + 4,629 + 4,783원
  r = evaluate({ ...jobLong, weeklyHours: 10 }, base, rules);
  eq('날짜: 주 15시간 미만이어도 3개월 이상이면 고용보험', [r.pay.employmentIns, r.pay.insurance], [true, 14195]);
  r = evaluate({ ...jobLong, weeklyHours: 10, endDate: '2026-05-30' }, base, rules);
  eq('날짜: 3개월이 안 되면 고용보험 없음', [r.pay.employmentIns, r.pay.insurance], [false, 0]);
  // 12월 20일~2027년 1월 10일: 2026년 안의 12일만 계산 (12,000×20×12/7 = 411,429원 + 다 채운 1주 48,000원)
  r = evaluate({ ...jobSpan, startDate: '2026-12-20', endDate: '2027-01-10' }, base, rules);
  // 고른 날짜도 해를 넘기면 결과 제목에는 올해 안의 날만 쓴다 (금액이 올해 부분만이라서)
  const pickCross = dateSpan({ workDates: ['2026-12-30', '2026-12-31', '2027-01-02'], dailyHours: 4 }, 2026);
  eq('날짜: 해를 넘기면 12월 31일까지만 계산하고 제목도 올해 부분만', [r.summary.addedIncome, r.summary.span.countedDays, r.summary.span.label, r.summary.span.countedLabel, pickCross.label, pickCross.countedLabel], [459429, 12, '12월 20일~2027년 1월 10일', '12월 20일~31일', '12월 30일~2027년 1월 2일 중 3일', '12월 30일~31일 중 2일']);
  eq('날짜: 해를 넘기는 날 안내', r.notices.some((n) => n.includes('해를 넘기는 10일')), true);
  eq('날짜: 끝나는 날이 시작일보다 앞서면 날짜로 계산하지 않음', dateSpan({ startDate: '2026-04-10', endDate: '2026-03-25' }, 2026), null);
  // 11. 일하는 날을 하나씩 고른 경우 (하루 시간 × 고른 날)
  // 11월 4·5·6·16·17·18일(수목금·월화수), 하루 4시간, 시급 12,000원: 24시간 → 288,000원
  //   7일씩 끊으면 11/4~10일 12시간, 11/11~17일 8시간 → 15시간 이상인 주가 없어 주휴수당·4대보험 없음
  const jobPick = { hourlyWage: 12000, workDates: ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-16', '2026-11-17', '2026-11-18'], dailyHours: 4, incomeType: 'wage' };
  r = evaluate(jobPick, base, rules);
  eq('고른 날짜: 급여와 주휴수당·보험료', [r.pay.base, r.pay.holidayPay, r.pay.insurance, r.summary.net], [288000, 0, 0, 288000]);
  eq('고른 날짜: 이름과 가장 많이 일한 주', [r.summary.span.label, r.summary.span.maxWeekHours, r.pay.shortJobDays], ['11월 4일~18일 중 6일', 12, 6]);
  eq('고른 날짜: 비교의 시간당 금액 (288,000 ÷ 24시간)', compareOffers([{ name: '고른 날', job: jobPick, meta: {} }], base, rules, { maxHours: 40 }).rows[0].netPerHour, 12000);
  // 11월 2~6일(월~금) + 9일(월), 하루 4시간: 11/2~8일이 20시간이라 그 주만 주휴수당 20÷40×8 = 4시간(48,000원)
  //   급여 24시간 288,000원 + 48,000원 = 336,000원, 4대보험 336,000 × 9.7174% = 32,650원 (한 달 미만이라 어림값)
  const jobPick2 = { ...jobPick, workDates: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09'] };
  r = evaluate(jobPick2, base, rules);
  eq('고른 날짜: 15시간 이상인 주만 주휴수당', [r.pay.base, r.pay.holidayPay, r.pay.gross, r.pay.insurance], [288000, 48000, 336000, 32650]);
  eq('고른 날짜: 한 달 미만이라 4대보험은 어림값', r.summary.parts.find((x) => x.label === '4대보험 근로자 부담분').status, STATUS.ESTIMATED);
  // 11월 30일(월)·12월 1일(화), 하루 8시간: 달마다 96,000원씩, 같은 주 16시간이라 4대보험 대상 (보험료 각 9,329원)
  r = evaluate({ ...jobPick, workDates: ['2026-11-30', '2026-12-01'], dailyHours: 8 }, { ...base, allowance: 'yes' }, rules);
  eq('고른 날짜: 달을 넘기면 달마다 나눔', r.summary.months.map((x) => [x.month, x.gross, x.deductions, x.allowancePaid]), [[11, 96000, 9329, 600000], [12, 96000, 9329, 600000]]);
  eq('고른 날짜: 하루 시간이 없으면 날짜로 계산하지 않음', dateSpan({ workDates: ['2026-11-04'], dailyHours: 0 }, 2026), null);

  return results;
}
