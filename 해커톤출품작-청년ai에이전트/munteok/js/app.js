// 문턱 화면 흐름
// 시작 → 공고 올리기 → 조건 확인 → 내 상황 → 결과 → 근무조건 비교 → 시작 전 준비
// 계산은 전부 engine.js가 한다. 이 파일은 입력을 모으고 결과를 그리기만 한다.
import { evaluate, searchAlternatives, compareOffers, buildRequestMessage, REQUEST_ACTIONS, STATUS, MAX_SHORT_DAYS, dateSpan } from './engine.js';
import { SAMPLES, EMPTY_PROFILE } from './samples.js';
import { API_BASE, AI_AVAILABLE, AI_OFF, CLARITY_ID } from './config.js';

const app = document.getElementById('app');
const topEl = document.getElementById('top');
const barEl = document.getElementById('bar');
const sheetEl = document.getElementById('sheet');
const clone = (o) => JSON.parse(JSON.stringify(o));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';

const state = {
  step: 'start', rules: null, sample: null, mode: 'text', rawText: '',
  fields: null, profile: clone(EMPTY_PROFILE), result: null, alts: null, aiError: null, loading: false,
  offers: [], editing: null, active: 0, comparison: null, reviewed: [], reviewTotal: 0,
  profileQ: 0, ytdOpen: false, chosenHours: null, requestAction: null, sheet: null, returnStep: 'start', inputHint: null,
  photoFiles: [],
};
const MAX_OFFERS = 3;
const MAX_TEXT = 4000; // AI 서버(api/extract.js)가 받는 글자 수와 같게 둔다
const MAX_PHOTOS = 3; // 한 공고를 나눠 찍은 사진. AI 서버의 MAX_IMAGES와 같게 둔다
const PHOTO_BUDGET = 3_800_000; // 사진 base64 합계. Vercel 요청 한도(4.5MB) 안에 들도록, 넘으면 더 줄여 보낸다

// 단계 막대: 6칸. 시작 화면과 안내 화면에는 막대 대신 로고를 보인다.
const STEP_GROUP = { upload: 0, input: 0, samples: 0, confirm: 1, offers: 1, profile: 2, compare: 3, result: 3, alts: 4, message: 4, basis: 5 };
// 진행 막대 6칸의 이름. PC에서만 막대 아래에 보인다. 첫 단계는 시작 화면의 3단계와 같은 말을 쓴다.
const STEP_NAMES = [AI_OFF ? '조건 넣기' : '공고 올리기', '조건 확인', '내 상황', '결과', '근무시간 비교', '시작 전 준비'];
const STATUS_LABEL = { [STATUS.CONFIRMED]: '확실', [STATUS.ESTIMATED]: '어림값', [STATUS.CHECK]: '확인 필요' };
const PAY_LABEL = { wage: '4대보험 떼고 받음', business: '3.3% 떼고 받음', daily: '일당으로 받음', unknown: '모름' };
const PAY_ASK = { wage: '4대보험 떼고 받는', business: '3.3% 떼고 받는', daily: '일당으로 받는' };
const SAMPLE_TEXT = {
  cafe: ['주말 카페 알바', '정부 수당을 받는 훈련생'],
  tutor: ['3.3% 떼는 학원 보조', '부모님 보험에 올라 있는 대학생'],
  store: ['조건이 빠진 편의점 공고', '급여를 어떻게 받는지 안 적힌 공고'],
};
const LINKS = {
  gov24Health: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050333',
  nhisHealth: 'https://www.nhis.or.kr/static/html/guide/sub2_010101.html',
  repo: 'https://github.com/JIHOSW/Hackathon',
  anthropicPrivacy: 'https://www.anthropic.com/legal/privacy',
  microsoftPrivacy: 'https://privacy.microsoft.com/ko-kr/privacystatement',
};

// ---------------- 아이콘 (선 아이콘, 화면 낭독기는 읽지 않음) ----------------
const ICON = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  home: '<path d="M4.5 11.2L12 4.8l7.5 6.4"/><path d="M6.8 9.6V19h10.4V9.6"/><path d="M10.2 19v-5h3.6v5"/>',
  ch: '<path d="M9 5l7 7-7 7"/>',
  cam: '<path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4z"/><circle cx="12" cy="13.2" r="3.1"/>',
  msg: '<path d="M5 5.5h14v9.5H10.5L6.5 18.5V15H5z"/><path d="M8.5 9h7M8.5 11.8h4"/>',
  pen: '<path d="M5 19l1-4L16 5l3 3L9 18z"/><path d="M14 7l3 3"/>',
  doc: '<path d="M7 4h7l4 4v12H7z"/><path d="M14 4v4h4"/><path d="M9.8 14l1.8 1.8 3.2-3.8"/>',
  file: '<path d="M7 4h7l4 4v12H7z"/><path d="M14 4v4h4"/><path d="M10 13h5M10 16h3"/>',
  plus: '<circle cx="12" cy="12" r="8"/><path d="M12 8.5v7M8.5 12h7"/>',
  down: '<path d="M12 5v13M6.5 12.5L12 18l5.5-5.5"/>',
  same: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/>',
  hold: '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.6a2.6 2.6 0 015 .9c0 1.7-2.5 2-2.5 3.5M12 16.8v.2"/>',
  noread: '<path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4z"/><path d="M9.5 11l5 5M14.5 11l-5 5"/>',
  link: '<path d="M10 14l4-4M9 7h-2a4 4 0 000 8h2M15 17h2a4 4 0 000-8h-2"/>',
  phone: '<path d="M6 4h3l1.5 4-2 1.5a10 10 0 005 5L15 12.5l4 1.5v3a2 2 0 01-2 2A14 14 0 014 6a2 2 0 012-2z"/>',
  pause: '<path d="M9 6.5v11M15 6.5v11"/>',
  play: '<path d="M8.5 6.3v11.4L17.5 12z"/>',
};
const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[name]}</svg>`;
// 로고: 보라 '한끗' 글자 로고(색은 css의 .logo)
const LOGO = '<span class="logo-word">한끗</span>';

// ---------------- 말투 ----------------
// 엔진과 규칙표의 문장은 "~함", "~습니다"로 끝나는 것이 있어, 화면에 보일 때 해요체로 바꾼다.
const ENDINGS = [
  [/입니다$/, '이에요'], [/있습니다$/, '있어요'], [/했습니다$/, '했어요'], [/됩니다$/, '돼요'], [/합니다$/, '해요'], [/습니다$/, '어요'],
  [/않음$/, '않아요'], [/없음$/, '없어요'], [/있음$/, '있어요'], [/넘음$/, '넘어요'], [/낮음$/, '낮아요'], [/빠짐$/, '빠져요'], [/줄어듦$/, '줄어들어요'],
  [/끝남$/, '끝나요'], [/끊김$/, '끊겨요'], [/이루어짐$/, '이루어져요'], [/달라짐$/, '달라져요'], [/정해짐$/, '정해져요'], [/생김$/, '생겨요'], [/해짐$/, '해져요'],
  [/가정함$/, '가정했어요'], [/계산함$/, '계산했어요'], [/답함$/, '답했어요'], [/넣음$/, '넣었어요'], [/못함$/, '못했어요'], [/필요함$/, '필요해요'], [/필요$/, '필요해요'],
  [/시작함$/, '시작해요'], [/됨$/, '돼요'], [/함$/, '해요'], [/(계산|기준|값|금액|시간)임$/, '$1이에요'], [/임$/, '예요'], [/기준$/, '기준이에요'],
];
function polite(text) {
  return String(text ?? '').split(/(?<=\.)\s+/).map((sentence) => {
    let body = sentence.replace(/\.$/, '');
    let tail = '';
    const paren = body.match(/^(.*?)(\s*\([^)]*\))$/);
    if (paren) { body = paren[1]; tail = paren[2]; }
    for (const [re, to] of ENDINGS) { if (re.test(body)) { body = body.replace(re, to); break; } }
    return body + tail;
  }).join('. ');
}

// 받침에 맞는 조사를 붙인다. 이름이 숫자로 끝나도 읽는 소리로 판단한다.
function josa(word, withFinal, withoutFinal) {
  const ch = String(word).trim().slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  let final;
  if (code >= 0 && code < 11172) final = code % 28 !== 0;
  else if (/[0-9]/.test(ch)) final = '013678'.includes(ch);
  else final = false;
  return word + (final ? withFinal : withoutFinal);
}

// ---------------- 공통 조각 ----------------

function tag(status) {
  const cls = status === STATUS.CONFIRMED ? 'ok' : status === STATUS.ESTIMATED ? 'est' : 'need';
  return `<span class="tagm ${cls}">${esc(STATUS_LABEL[status] || status)}</span>`;
}

// 만 원 단위로 바꾼다. 조각을 반올림해도 합이 전체의 반올림과 같도록 큰 나머지부터 올린다.
function splitMan(values) {
  const total = Math.round(values.reduce((a, b) => a + b, 0) / 10000);
  const floors = values.map((v) => Math.floor(v / 10000));
  const order = values.map((v, i) => [v / 10000 - floors[i], i]).sort((a, b) => b[0] - a[0]);
  let left = total - floors.reduce((a, b) => a + b, 0);
  for (const [, i] of order) { if (left <= 0) break; floors[i] += 1; left -= 1; }
  return floors;
}
const man = (n) => `${Math.round(n / 10000).toLocaleString('ko-KR')}만 원`;
const manOrWon = (n) => (Math.abs(n) < 10000 ? won(n) : man(n));

// 문턱 막대: 버는 돈이 남는 돈, 보험료·세금, 줄어드는 정부 지원으로 나뉘는 한 줄 막대
function moneyParts(s) {
  const deduct = s.insurance + s.withholding;
  const loss = s.allowanceLoss;
  const kept = Math.max(0, s.addedIncome - deduct - loss);
  const deductName = s.withholding && !s.insurance ? '미리 떼는 세금 3.3%' : s.withholding ? '보험료·세금' : '보험료';
  return { kept, deduct, loss, deductName };
}
// 제목, 범례, 목록이 같은 만 원 값을 쓰도록 한 번만 나눈다.
function manParts(s) {
  const { kept, deduct, loss } = moneyParts(s);
  const [k, d, l] = splitMan([kept, deduct, loss]);
  return { kept: k, deduct: d, loss: l, gross: k + d + l };
}
function moneyBar(s, { scale = null, height = 16, legend = true, lossName = '줄어드는 정부 지원', keptName = '남는 돈' } = {}) {
  const { kept, deduct, loss, deductName } = moneyParts(s);
  const segs = [['g', kept, keptName], ['o', deduct, deductName], ['r', loss, lossName]].filter(([, v]) => v > 0);
  const sum = segs.reduce((a, [, v]) => a + v, 0) || 1;
  const width = scale ? Math.min(100, (Math.max(s.addedIncome, sum) / scale) * 100) : 100;
  const mans = splitMan(segs.map(([, v]) => v));
  const label = segs.map(([, v, n], i) => `${n} ${v < 10000 ? won(v) : mans[i].toLocaleString('ko-KR') + '만 원'}`).join(', ');
  const bar = `<div class="tbar" style="width:${width.toFixed(1)}%;height:${height}px" role="img" aria-label="${esc(label)}">${segs.map(([c, v]) => `<i class="${c}" style="width:${((v / sum) * 100).toFixed(1)}%"></i>`).join('')}</div>`;
  if (!legend) return bar;
  // 빠지는 돈(보험료·세금, 줄어드는 지원)은 앞에 −를 붙여 남는 돈과 구분한다.
  return bar + `<div class="lgv">${segs.map(([c, v, n], i) => `<div class="${c}"><span>${esc(n)}</span><b>${c === 'g' ? '' : '−'}${v < 10000 ? won(v) : mans[i].toLocaleString('ko-KR') + '만 원'}</b></div>`).join('')}</div>`;
}

// 영수증 줄: 버는 돈 → − 빼는 돈 → − 줄어드는 정부 지원 → 점선 → = 남는 돈. 모든 줄에 '원'을 붙이고 숫자는 오른쪽 정렬한다.
// short면 만 원 단위(시작 화면 예시, 제목과 같은 값), 아니면 '금액 자세히 보기'와 같은 원 단위 계산값을 쓴다.
function receiptRows(s, { short = false, keptName = '남는 돈' } = {}) {
  const { kept, deduct, loss, deductName } = moneyParts(s);
  const mp = manParts(s);
  const val = (v, m) => (short && v >= 10000 ? `${m.toLocaleString('ko-KR')}만 원` : won(v));
  const rows = [['', '버는 돈', val(s.addedIncome, mp.gross)]];
  if (deduct > 0) rows.push(['o', deductName, `−${val(deduct, mp.deduct)}`]);
  if (loss > 0) rows.push(['r', '줄어드는 정부 지원', `−${val(loss, mp.loss)}`]);
  const total = short ? val(kept, mp.kept) : s.net < 0 ? `−${won(-s.net)}` : won(s.net);
  const cls = s.net > 0 ? 'g' : s.net < 0 ? 'neg' : '';
  return `<dl class="rc">${rows.map(([c, k, v]) => `<div class="rc-row ${c}"><dt>${esc(k)}</dt><dd class="num">${v}</dd></div>`).join('')}
    <div class="rc-row sum ${cls}"><dt>${esc(keptName)}</dt><dd class="num">${total}</dd></div></dl>`;
}
const STAMP = '<span class="stamp">참고용 추정</span>';
// 결과 숫자: 0.5초 동안 한 번만 올라간다. 화면 읽기 프로그램에는 마지막 값만 읽힌다.
const countNum = (n) => `<span class="count" data-to="${n}"><span class="sr-only">${n.toLocaleString('ko-KR')}</span><span class="cv" aria-hidden="true">${n.toLocaleString('ko-KR')}</span></span>`;

function row({ ic = null, cls = '', title, sub = '', badge = '', action = '', attrs = '', arrow = Boolean(action) }) {
  const tagName = action ? 'button' : 'div';
  return `<${tagName} class="row" ${action ? `type="button" data-action="${action}" ${attrs}` : ''}>
    ${ic ? `<span class="ic ${cls}">${icon(ic)}</span>` : ''}
    <span class="tx"><b>${title}${badge}</b>${sub ? `<small>${sub}</small>` : ''}</span>
    ${arrow ? `<span class="ch">${icon('ch')}</span>` : ''}
  </${tagName}>`;
}

function cta(label, action, attrs = '') { return `<button type="button" class="cta" data-action="${action}" ${attrs}>${label}</button>`; }
function weak(label, action, attrs = '') { return `<button type="button" class="cta weak" data-action="${action}" ${attrs}>${label}</button>`; }
const two = (a, b) => `<div class="two">${a}${b}</div>`;
const linkBtn = (label, action, attrs = '') => `<button type="button" class="link" data-action="${action}" ${attrs}>${label}${icon('ch')}</button>`;
const why = (text) => `<div class="why"><b>왜 물어보나요?</b>${text}</div>`;
const DISCLAIMER = '<p class="disc">참고용 계산이며 세무·법률 자문과 행정기관의 최종 판단을 대체하지 않습니다<br>AI가 생성한 내용이 포함되어 있습니다</p>';
const AI_NOTICE = `<p class="gline">공고 사진과 글은 AI(Anthropic Claude)가 읽어요. 한끗 서버에는 저장하지 않아요. <button type="button" class="inline" data-action="privacy">개인정보 처리 안내</button></p>`;

// ---------------- 시작 ----------------

function sampleSummary(id) {
  const s = SAMPLES.find((x) => x.id === id);
  const f = Object.fromEntries(Object.entries(s.extraction).map(([k, v]) => [k, v.value]));
  const job = { hourlyWage: f.hourlyWage, weeklyHours: f.weeklyHours, startMonth: f.startMonth || 1, months: f.months || 12, incomeType: f.incomeType, holidayIncluded: Boolean(f.holidayIncluded) };
  return evaluate(job, s.profile, state.rules).summary;
}


function viewStart() {
  const s = sampleSummary('cafe');
  const first = AI_OFF ? '조건 넣기' : '공고 올리기';
  // PC에서는 왼쪽에 제목·대상·3단계·주 버튼, 오른쪽에 예시 영수증을 둔다. 휴대폰은 배치를 그대로 두고(pc-only는 숨김), 대상 문장만 부제 아래에 작게 보인다.
  // 부제는 첫 화면에서 AI가 하는 일(공고 읽기)과 계산은 공식 기준으로 한다는 것을 알린다. AI를 끈 체험 주소는 예전 부제 그대로다.
  return {
    top: 'logo',
    html: `<div class="hero">
      <h1 class="t1">일하기 전에<br><mark>내 돈</mark>부터 확인해요</h1>
      <p class="sub">${AI_OFF ? '시급과 일하는 시간만 넣으면 3분 만에 끝나요' : '알바 공고를 올리면 AI가 조건을 읽고, 계산은 공식 기준으로 해요'}</p>
    </div>
    <p class="who">정부 지원을 받으면서 일을 시작하려는 청년을 위한 서비스를 만들었어요</p>
    <ol class="steps3 pc-only"><li>${first}</li><li>조건 확인</li><li>남는 돈</li></ol>
    <div class="start-cta pc-only">${cta(first, 'go', 'data-step="upload"')}${weak('예시로 먼저 해 보기', 'go', 'data-step="samples"')}</div>
    <div class="card pv tap rcpt" role="button" tabindex="0" data-action="sample" data-id="cafe" aria-label="주말 카페 알바 예시로 해 보기">
      <span class="chip">예시</span>
      <p class="pvt">주말 카페 알바로<br>한 달에 <span class="num">${man(s.addedIncome)}</span>을 벌면,<br>실제로 남는 돈은 <mark class="num">${man(s.net)}</mark>이에요</p>
      ${moneyBar(s, { legend: false })}
      ${receiptRows(s, { short: true })}
      <div class="rc-foot">${STAMP}<span class="pv-go">이 예시로 해 보기${icon('ch')}</span></div>
    </div>
    <p class="gline center">로그인 없이 바로 써요 · 입력한 내용은 서버에 저장하지 않아요</p>
    <p class="gline center"><button type="button" class="inline" data-action="privacy">개인정보 처리 안내</button></p>`,
    bottom: `${cta(first, 'go', 'data-step="upload"')}${linkBtn('예시로 먼저 해 보기', 'go', 'data-step="samples"')}`,
  };
}

// ---------------- 공고 올리기 ----------------

function viewUpload() {
  // 공개 체험 주소에서는 AI 공고 읽기를 끄고 직접 입력과 예시만 보여 준다.
  if (AI_OFF) {
    return {
      layout: 'c2',
      html: `<h1 class="t2 hd">조건을 어떻게<br>넣을까요?</h1>
      <div class="rows">
        ${row({ ic: 'pen', title: '직접 입력하기', sub: '시급과 시간만 알아도 돼요', action: 'mode', attrs: 'data-mode="manual"' })}
        ${row({ title: '예시 공고로 해 보기', sub: '카페 알바, 학원 보조, 두 제안 비교', action: 'go', attrs: 'data-step="samples"' })}
      </div>
      <div class="cb"><p class="gline">이 체험 주소에서는 AI 공고 읽기를 쓰지 않아요. 공고 사진이나 글은 보내지 않아요. <button type="button" class="inline" data-action="privacy">개인정보 처리 안내</button></p></div>`,
    };
  }
  // PC에서는 왼쪽에 올리는 방법 3줄, 오른쪽(.cb)에 예시·읽는 공고·AI 안내. 휴대폰은 위에서 아래로 그대로다.
  return {
    layout: 'c2',
    html: `<h1 class="t2 hd">공고를 어떻게<br>올릴까요?</h1>
    <div class="rows">
      ${row({ ic: 'cam', title: '사진으로 올리기', sub: '공고 캡처나 사진', action: 'mode', attrs: 'data-mode="photo"' })}
      ${row({ ic: 'msg', title: '글 붙여넣기', sub: '문자나 카톡으로 받은 제안', action: 'mode', attrs: 'data-mode="text"' })}
      ${row({ ic: 'pen', title: '직접 입력하기', sub: '시급과 시간만 알아도 돼요', action: 'mode', attrs: 'data-mode="manual"' })}
    </div>
    <div class="cb">
    <p class="sec">공고가 아직 없다면</p>
    <div class="rows">${row({ title: '예시 공고로 해 보기', sub: '카페 알바, 학원 보조, 두 제안 비교', action: 'go', attrs: 'data-step="samples"' })}</div>
    <p class="sec">이런 공고도 읽어요</p>
    <div class="chips"><span>시급</span><span>월급</span><span>일당</span><span>3.3% 떼는 제안</span><span>조건이 빠진 공고</span></div>
    ${AI_NOTICE}
    </div>`,
  };
}

function viewSamples() {
  const r = (id) => row({ title: SAMPLE_TEXT[id][0], sub: SAMPLE_TEXT[id][1], action: 'sample', attrs: `data-id="${id}"` });
  // '제안 더하기'로 왔다면 예시를 고르는 순간 저장한 제안이 예시로 바뀌어 사라진다. 고르기 전에 알린다.
  const n = state.offers.length;
  const warn = n ? `<p class="gline warn">예시를 고르면 저장한 제안 ${n}개가 지워져요. 두 제안 비교는 '두 제안 비교하기' 예시로 볼 수 있어요</p>` : '';
  return {
    html: `<h1 class="t2">어떤 <mark>예시</mark>로<br>해 볼까요?</h1>
    ${warn}
    <div class="rows">${r('cafe')}${r('tutor')}${r('store')}
      ${row({ title: '두 제안 비교하기', sub: '카페와 학원을 나란히', action: 'samplePair' })}</div>
    <p class="gline">예시는 지어낸 공고와 인물이에요</p>`,
  };
}

// ---------------- 직접 입력: 매주 같은 요일 / 날짜를 골라서 ----------------
// 직접 입력 값은 state.manual에 두고, 바뀔 때마다 화면을 다시 그린다. 글자를 넣는 칸은 입력할 때마다 저장한다.
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']; // 인덱스는 Date.getDay()와 같다 (0=일)
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const pad2 = (n) => String(n).padStart(2, '0');
const isoDate = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
function manualDefaults() {
  const year = state.rules.appliesToYear;
  const now = new Date();
  const inYear = now.getFullYear() === year;
  return {
    how: 'pattern', wage: '', days: [1, 2, 3, 4, 5], dates: [], calMonth: inYear ? now.getMonth() + 1 : 1,
    start: '09:00', end: '13:00', breakMin: 0, openBreak: false, openHoliday: false,
    sdate: inYear ? isoDate(year, now.getMonth() + 1, now.getDate()) : `${year}-01-01`, edate: '',
    type: 'unknown', holiday: false,
  };
}
function manual() {
  if (!state.manual) state.manual = manualDefaults();
  return state.manual;
}
// 조건 확인 화면에서 시간·기간을 고칠 때, 저장된 값을 직접 입력 화면으로 되돌린다.
function fieldsToManual(f) {
  const base = manualDefaults();
  const w = f.weeklyHours;
  const mo = f.months;
  const sc = w.sched || {};
  return {
    ...base,
    how: w.how, wage: f.hourlyWage.value ? String(f.hourlyWage.value) : '',
    days: sc.days || base.days, dates: mo.unit === 'picked' ? [...mo.dates] : [],
    calMonth: mo.unit === 'picked' ? Number(mo.dates[0].slice(5, 7)) : base.calMonth,
    start: sc.start || base.start, end: sc.end || base.end, breakMin: sc.breakMin || 0,
    sdate: mo.unit === 'date' ? mo.start : base.sdate, edate: mo.unit === 'date' ? mo.end : '',
    type: f.incomeType.value, holiday: Boolean(f.holidayIncluded && f.holidayIncluded.value),
    // 기본값이 아닌 값을 넣었던 칸은 펼쳐 둔다.
    openBreak: (sc.breakMin || 0) > 0, openHoliday: Boolean(f.holidayIncluded && f.holidayIncluded.value),
  };
}
const fmtH = (h) => String(Math.round(h * 100) / 100);
// 쉬는 시간과 주휴수당은 기본값(없음 / 따로 받아요)으로 한 줄만 보이고, "바꾸기"를 눌러야 펼친다.
const BREAKS = [[0, '없음'], [30, '30분'], [60, '1시간'], [90, '1시간 30분'], [120, '2시간']];
const breakLabel = (min) => (BREAKS.find(([v]) => v === min) || [0, `${min}분`])[1];
/** 출근·퇴근·쉬는 시간으로 하루 근무시간을 계산한다. 퇴근이 출근보다 이르면 밤을 넘기는 근무로 본다. */
function dailyHoursOf(m) {
  const toMin = (t) => { const x = /^(\d{1,2}):(\d{2})/.exec(t || ''); return x ? Number(x[1]) * 60 + Number(x[2]) : null; };
  const a = toMin(m.start);
  const b = toMin(m.end);
  if (a === null || b === null || a === b) return null;
  const mins = (b > a ? b - a : b - a + 1440) - (m.breakMin || 0);
  return mins > 0 ? mins / 60 : null;
}
// 하루 근무 시간이 없을 때 이유: 칸이 비었는지, 출근과 퇴근이 같은지, 쉬는 시간을 빼면 남는 시간이 없는지.
function timeProblem(m) {
  const ok = (t) => /^\d{1,2}:\d{2}/.test(t || '');
  if (!ok(m.start) || !ok(m.end)) return '출근·퇴근 시간을 넣어 주세요';
  if (m.start.slice(0, 5) === m.end.slice(0, 5)) return '출근과 퇴근 시간이 같아요. 퇴근 시간을 확인해 주세요';
  return '쉬는 시간을 빼면 일하는 시간이 없어요. 쉬는 시간을 확인해 주세요';
}
/** [1,2,3,4,5] → '월~금', [6,0] → '토·일', [1,3,5] → '월·수·금' */
function daysLabel(days) {
  const order = WEEK_ORDER.filter((d) => days.includes(d));
  const idx = order.map((d) => WEEK_ORDER.indexOf(d));
  const run = order.length >= 3 && idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  return run ? `${WEEKDAY[order[0]]}~${WEEKDAY[order[order.length - 1]]}` : order.map((d) => WEEKDAY[d]).join('·');
}
/** '2026-03-25', '2026-04-10' → '3월 25일~4월 10일' (다른 해면 연도를 붙인다) */
function spanText(start, end) {
  const year = state.rules.appliesToYear;
  const md = (t) => { const [y, m, d] = t.split('-').map(Number); return `${y !== year ? `${y}년 ` : ''}${m}월 ${d}일`; };
  return `${md(start)}~${md(end)}`;
}
function daysBetween(start, end) {
  const t = (x) => { const [y, m, d] = x.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(end) - t(start)) / 86400000) + 1;
}
/** ['2026-11-04', '2026-11-05', '2026-12-01'] → '11월 4·5일, 12월 1일'. 많으면 '11월 4일~12월 1일 중 15일' */
function datesText(dates) {
  const sorted = [...dates].sort();
  if (sorted.length > 12) return `${spanText(sorted[0], sorted[sorted.length - 1])} 중 ${sorted.length}일`;
  const byMonth = new Map();
  for (const d of sorted) {
    const m = Number(d.slice(5, 7));
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(Number(d.slice(8, 10)));
  }
  return [...byMonth].map(([m, ds]) => `${m}월 ${ds.join('·')}일`).join(', ');
}
// 고른 날짜에서 가장 많이 일한 주의 시간. 엔진(dateSpan)과 같은 방식으로 센다.
function pickedWeekHours(dates, daily) {
  const sp = dateSpan({ workDates: dates, dailyHours: daily }, state.rules.appliesToYear);
  return sp ? sp.maxWeekHours : 0;
}
function manualCalcHtml() {
  const m = manual();
  const d = dailyHoursOf(m);
  if (!d) return `<span class="warn">${timeProblem(m)}</span>`;
  if (m.how === 'pattern') {
    if (!m.days.length) return '<span class="warn">일하는 요일을 골라 주세요</span>';
    const w = d * m.days.length;
    return `<span>하루 ${fmtH(d)}시간</span>×<span>${m.days.length}일</span>=<span class="res">주 ${fmtH(w)}시간</span>${w > 52 ? '<span class="warn">일주일에 52시간을 넘어요</span>' : ''}`;
  }
  if (!m.dates.length) return '<span class="warn">달력에서 일하는 날을 골라 주세요</span>';
  return `<span>하루 ${fmtH(d)}시간</span>×<span>${m.dates.length}일</span>=<span class="res">모두 ${fmtH(d * m.dates.length)}시간</span>`;
}
// 여러 날을 고를 수 있는 달력. 브라우저 기본 달력은 하루만 고를 수 있어 직접 그린다. 월요일부터 시작한다.
function calendarHtml(m) {
  const year = state.rules.appliesToYear;
  const mo = m.calMonth;
  const lead = (new Date(Date.UTC(year, mo - 1, 1)).getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(year, mo, 0)).getUTCDate();
  const cells = Array.from({ length: lead }, () => '<span class="cal-e" aria-hidden="true"></span>');
  for (let d = 1; d <= daysIn; d++) {
    const v = isoDate(year, mo, d);
    const on = m.dates.includes(v);
    const wd = new Date(Date.UTC(year, mo - 1, d)).getUTCDay();
    cells.push(`<button type="button" class="cal-d ${on ? 'on' : ''} ${wd === 0 || wd === 6 ? 'we' : ''}" data-action="calDay" data-value="${v}" aria-pressed="${on}" aria-label="${mo}월 ${d}일 ${WEEKDAY[wd]}요일">${d}</button>`);
  }
  const inMonth = m.dates.some((x) => x.startsWith(`${year}-${pad2(mo)}-`));
  return `<div class="cal">
    <div class="cal-h">
      <button type="button" class="cal-nav" data-action="calMove" data-value="-1" aria-label="이전 달" ${mo <= 1 ? 'disabled' : ''}>${icon('back')}</button>
      <b aria-live="polite">${year}년 ${mo}월</b>
      <button type="button" class="cal-nav" data-action="calMove" data-value="1" aria-label="다음 달" ${mo >= 12 ? 'disabled' : ''}>${icon('ch')}</button>
    </div>
    <div class="cal-g" role="group" aria-label="${mo}월 날짜">${WEEK_ORDER.map((d) => `<span class="dow ${d === 0 || d === 6 ? 'we' : ''}" aria-hidden="true">${WEEKDAY[d]}</span>`).join('')}${cells.join('')}</div>
    <div class="chips cal-q">
      <button type="button" data-action="calQuick" data-value="weekdays">이 달 평일 모두</button>
      <button type="button" data-action="calQuick" data-value="weekend">이 달 주말 모두</button>
      ${inMonth ? '<button type="button" data-action="calQuick" data-value="clear">이 달 지우기</button>' : ''}
    </div>
    <p class="gline">${m.dates.length ? `고른 날: ${datesText(m.dates)}` : '일하는 날을 눌러 골라 주세요. 다시 누르면 빠져요'}</p>
  </div>`;
}

function viewInput() {
  if (state.loading) {
    return { layout: 'c1', html: `<div class="center-box" role="status"><div class="spin" aria-hidden="true"></div><h1 class="t2">공고를 읽고 있어요</h1><p class="sub">3~5초쯤 걸려요</p></div>` };
  }
  if (state.aiError) {
    const e = state.aiError;
    const title = e.kind === 'notPosting' ? '일자리 공고가<br>아닌 것 같아요' : e.kind === 'photo' ? '사진에서 글자를<br>읽지 못했어요' : e.kind === 'tooLong' ? '공고가<br>너무 길어요' : '지금은 공고를<br>읽지 못했어요';
    const sub = e.kind === 'notPosting' ? '시급이나 근무시간이 보이지 않아요. 다른 글을 올리거나 직접 입력해 주세요'
      : e.kind === 'photo' ? '다시 올리거나 직접 입력해 주세요'
        : e.kind === 'tooLong' ? `${MAX_TEXT.toLocaleString('ko-KR')}자까지 읽을 수 있어요. 시급·근무시간·기간이 적힌 부분만 남기고 다시 붙여 주세요`
          : '잠시 뒤 다시 읽거나 직접 입력해 주세요';
    const tips = e.kind === 'photo' ? `<div class="tips"><p class="tip">글자가 또렷하게 보이게 찍기</p><p class="tip">한 장에 안 들어오면 나눠서 ${MAX_PHOTOS}장까지 올리기</p></div>` : '';
    return {
      layout: 'c1',
      html: `<div class="big">${icon(e.kind === 'notPosting' ? 'file' : 'noread')}</div>
        <h1 class="t2" role="alert">${title}</h1><p class="sub">${esc(sub)}</p>${tips}
        ${e.detail ? `<p class="gline">${esc(e.detail)}</p>` : ''}`,
      // '다시 읽기'는 서버 문제로 같은 공고를 다시 읽을 때만. 공고가 아니거나 사진을 못 읽었으면 입력 화면으로 돌아가므로 그 일을 버튼 이름으로 쓴다.
      bottom: two(weak(e.kind === 'tooLong' ? '다시 붙여 넣기' : e.kind === 'server' ? '다시 읽기' : e.kind === 'photo' || state.mode === 'photo' ? '사진 다시 고르기' : '글 고치기', 'retry'), cta('직접 입력하기', 'mode', 'data-mode="manual"')),
    };
  }
  const hint = state.inputHint ? `<p class="gline warn" role="alert">${esc(state.inputHint)}</p>` : '';
  // 사진·글: PC에서는 왼쪽에 제목과 입력 칸, 오른쪽(.cb)에 찍는 법·지울 것·AI 안내
  // 사진은 3장까지 고르거나 끌어다 놓을 수 있다(끌어다 놓기 안내는 마우스를 쓰는 화면에서만 보인다). 고른 사진은 아래 목록에서 뺄 수 있다.
  if (state.mode === 'photo') {
    const files = state.photoFiles || [];
    const full = files.length >= MAX_PHOTOS;
    return {
      layout: 'c2',
      html: `<h1 class="t2 hd">공고 <mark>사진</mark>을<br>올려 주세요</h1>
      <label class="drop" for="photo" id="drop">
        <span class="ic">${icon('cam')}</span><b id="photo-name">${!files.length ? '사진 고르기' : full ? `사진 ${MAX_PHOTOS}장을 다 골랐어요` : '사진 더 고르기'}</b>
        <span>${files.length ? `${files.length} / ${MAX_PHOTOS}장` : `캡처한 화면도 괜찮아요 · ${MAX_PHOTOS}장까지`}<span class="drag-hint"> · 끌어다 놓아도 돼요</span></span>
        <input id="photo" type="file" accept="image/*" multiple class="sr-only">
      </label>
      ${files.length ? `<ul class="photo-list" aria-label="고른 사진">${files.map((f, i) => `<li><span class="nm">${esc(f.name)}</span><button type="button" class="inline" data-action="removePhoto" data-i="${i}" aria-label="${esc(f.name)} 빼기">빼기</button></li>`).join('')}</ul>` : ''}
      ${hint}
      <div class="cb">
      <div class="tips"><p class="tip">글자가 또렷하게 보이게</p><p class="tip">한 장에 안 들어오면 나눠서 ${MAX_PHOTOS}장까지</p><p class="tip">이름과 전화번호는 가리고</p></div>
      ${AI_NOTICE}
      </div>`,
      bottom: cta('공고 읽기', 'extract'),
    };
  }
  if (state.mode === 'text') {
    return {
      layout: 'c2',
      html: `<h1 class="t2 hd">받은 제안을<br><mark>그대로</mark> 붙여 주세요</h1>
      <label class="sr-only" for="raw">공고나 제안 메시지</label>
      <textarea id="raw" class="ta" placeholder="예: 주 3회 저녁 6시~10시, 시급 13,000원, 3.3% 떼고 지급">${esc(state.rawText)}</textarea>
      ${hint}
      <div class="cb">
      <p class="gline">이름과 전화번호는 지우고 붙여 주세요</p>
      ${AI_NOTICE}
      </div>`,
      bottom: cta('공고 읽기', 'extract'),
    };
  }
  const m = manual();
  const year = state.rules.appliesToYear;
  const seg = (action, cur, v, label) => `<button type="button" class="seg-b ${cur === v ? 'on' : ''}" data-action="${action}" data-value="${v}" aria-pressed="${cur === v}">${label}</button>`;
  const hoursHtml = `<p class="lbl">하루 근무 시간</p>
      <div class="grid2 pair">
        <div><label for="m-tstart">출근</label><input id="m-tstart" class="field" type="time" value="${m.start}" required></div>
        <div><label for="m-tend">퇴근</label><input id="m-tend" class="field" type="time" value="${m.end}" required></div>
      </div>
      ${m.openBreak
        ? `<label for="m-break">쉬는 시간</label>
          <select id="m-break">${BREAKS.map(([v, l]) => `<option value="${v}" ${m.breakMin === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`
        : `<p class="fold">쉬는 시간 <b>${breakLabel(m.breakMin)}</b>으로 계산해요<button type="button" class="inline" data-action="mOpen" data-value="break" aria-label="쉬는 시간 바꾸기">바꾸기</button></p>`}
      <div class="calc" id="m-calc" aria-live="polite">${manualCalcHtml()}</div>`;
  // PC에서는 두 칸: 왼쪽(.m-l)에 시급·일하는 방식·요일(날짜), 오른쪽(.m-r)에 기간·급여 받는 방식.
  // 하루 근무 시간은 요일 아래(왼쪽)에 두고, 날짜를 고를 때만 달력이 왼쪽을 채우므로 오른쪽 맨 위로 옮긴다.
  // 어느 쪽이든 순서는 같아서 휴대폰은 그대로 한 줄로 이어진다.
  return {
    layout: 'c2',
    html: `<h1 class="t2 hd">조건을 <mark>직접</mark><br>입력해 주세요</h1>
    <form id="manual" class="form">
      <div class="m-l">
      <label for="m-wage">시급</label><div class="unit"><input id="m-wage" type="number" inputmode="numeric" min="1" max="999999" required placeholder="10,320" value="${esc(m.wage)}"><span>원</span></div>
      <p class="lbl">어떻게 일하나요?</p>
      <div class="seg2" role="group" aria-label="일하는 방식">${seg('mHow', m.how, 'pattern', '매주 같은 요일에')}${seg('mHow', m.how, 'picked', '날짜를 골라서')}</div>
      ${m.how === 'pattern'
        ? `<p class="lbl">일하는 요일</p>
          <div class="days" role="group" aria-label="일하는 요일">${WEEK_ORDER.map((d) => `<button type="button" class="seg-b ${m.days.includes(d) ? 'on' : ''}" data-action="mDay" data-value="${d}" aria-pressed="${m.days.includes(d)}">${WEEKDAY[d]}</button>`).join('')}</div>`
        : `<p class="lbl">일하는 날</p>${calendarHtml(m)}`}
      ${m.how === 'pattern' ? hoursHtml : ''}
      </div>
      <div class="m-r">
      ${m.how === 'pattern' ? '' : hoursHtml}
      ${m.how === 'pattern' ? `<p class="lbl">언제부터 언제까지 일하나요?</p>
        <div class="grid2 pair">
          <div><label for="m-sdate">시작일</label><input id="m-sdate" class="field" type="date" min="${year}-01-01" max="${year}-12-31" value="${m.sdate}" aria-required="true"></div>
          <div><label for="m-edate">끝나는 날</label><input id="m-edate" class="field" type="date" min="${m.sdate || `${year}-01-01`}" max="${year + 1}-12-31" value="${m.edate}" aria-required="true"></div>
        </div>
        <div class="chips" role="group" aria-label="시작일부터 기간 고르기">${[['1', '1개월'], ['3', '3개월'], ['6', '6개월'], ['end', '연말까지']].map(([v, l]) => `<button type="button" data-action="mPeriod" data-value="${v}">${l}</button>`).join('')}</div>` : ''}
      <p class="lbl">급여를 어떻게 받나요?</p>
      <div class="seg2">${seg('mType', m.type, 'wage', '4대보험 떼고')}${seg('mType', m.type, 'business', '3.3% 떼고')}${seg('mType', m.type, 'daily', '일당으로')}${seg('mType', m.type, 'unknown', '모르겠어요')}</div>
      ${m.type !== 'wage' ? '' : m.openHoliday
        ? `<p class="lbl">주휴수당은 어떻게 받나요?</p>
          <div class="seg2">${seg('mHoliday', String(m.holiday), 'false', '시급과 따로 받아요')}${seg('mHoliday', String(m.holiday), 'true', '시급에 포함돼 있어요')}</div>
          <p class="gline">일주일에 15시간 이상 일하면 받는 수당이에요. 모르면 '따로 받아요'로 계산해요</p>`
        : `<p class="fold">주휴수당은 <b>${m.holiday ? '시급에 포함된' : '시급과 따로 받는'}</b> 것으로 계산해요<button type="button" class="inline" data-action="mOpen" data-value="holiday" aria-label="주휴수당 받는 방식 바꾸기">바꾸기</button></p>`}
      </div>
    </form>
    <p class="gline">${year}년 최저임금은 시급 ${won(state.rules.minimumWage.hourly)}이에요</p>`,
    bottom: `<button type="submit" form="manual" class="cta">조건 확인하기</button>`,
  };
}

// ---------------- 조건 확인 ----------------

const FIELD_NAME = { hourlyWage: '시급', weeklyHours: '일하는 시간', startMonth: '시작', months: '기간', incomeType: '급여', holidayIncluded: '주휴수당' };
const FIELD_ORDER = ['weeklyHours', 'months', 'hourlyWage', 'startMonth', 'incomeType', 'holidayIncluded'];
const WHY = {
  weeklyHours: '일주일에 15시간 이상이면 주휴수당과 4대보험이 달라져요. 그래서 시간이 가장 중요해요.',
  months: '부모님 세금 공제 같은 기준은 1년 동안 번 돈으로 봐요. 그래서 몇 달 일하는지가 필요해요.',
  hourlyWage: '모든 금액이 시급에서 시작해요.',
  startMonth: '1년 기준은 1월부터 12월까지 번 돈을 더해서 봐요.',
  incomeType: '4대보험을 떼는지, 3.3%를 떼는지에 따라 적용되는 기준이 달라요.',
  holidayIncluded: '주휴수당을 따로 받으면 한 달 급여가 달라져요.',
};

function valueText(key, f) {
  const v = f.value;
  // AI가 공고에서 읽지 못해 빈 값(null)이면 '일주일에 null시간'처럼 보이지 않게 '모름'으로 쓴다(예: 근무요일 '요일협의').
  if (key === 'hourlyWage') return v ? won(v) : '모름';
  if (key === 'weeklyHours') {
    if (v == null && f.how !== 'picked') return '모름';
    if (f.how === 'pattern') return `${daysLabel(f.sched.days)} ${f.sched.start}~${f.sched.end} · 주 ${fmtH(v)}시간`;
    if (f.how === 'picked') return `하루 ${fmtH(f.daily)}시간 · ${f.sched.start}~${f.sched.end}`;
    return `일주일에 ${v}시간`;
  }
  if (key === 'startMonth') return v ? `${v}월` : '모름';
  if (key === 'months' && f.toYearEnd) return '연말까지';
  if (key === 'months') return v ? (f.unit === 'picked' ? `${datesText(f.dates)} (${f.dates.length}일)` : f.unit === 'date' ? spanText(f.start, f.end) : f.unit === 'day' ? `${v}일` : `${v}개월`) : '모름';
  if (key === 'incomeType') return PAY_LABEL[v] || '모름';
  return v ? '시급에 포함' : '따로 받아요';
}
function askText(key, f) {
  const v = f.value;
  if (key === 'weeklyHours') return `일주일에 <mark class="num">${v}시간</mark><br>일하는 게 맞나요?`;
  if (key === 'months' && f.toYearEnd) return '<mark>연말까지</mark><br>일하는 게 맞나요?';
  if (key === 'months') return f.unit === 'date' ? `<mark class="num">${spanText(f.start, f.end)}</mark><br>일하는 게 맞나요?` : `<mark class="num">${v}${f.unit === 'day' ? '일' : '개월'}</mark> 동안<br>일하는 게 맞나요?`;
  if (key === 'hourlyWage') return `시급이 <mark class="num">${won(v)}</mark>이<br>맞나요?`;
  if (key === 'startMonth') return `<mark class="num">${v}월</mark>부터<br>일하는 게 맞나요?`;
  if (key === 'incomeType') return `급여를 <mark>${esc(PAY_ASK[v] || PAY_LABEL[v])}</mark> 게<br>맞나요?`;
  return `주휴수당을 <mark>${v ? '시급에 포함해' : '따로'}</mark><br>받는 게 맞나요?`;
}

// 날짜로 넣은 기간은 시작일이 시작하는 달을 정하므로 시작 달은 따로 보이지 않는다.
// 날짜로 넣은 기간은 시작일이나 고른 날이 시작하는 달을 정하므로 시작 달은 따로 보이지 않는다.
// 시작 달부터 12월까지의 개월 수 (3월 시작이면 10개월)
function monthsToYearEnd() { return 13 - (Number(state.fields.startMonth && state.fields.startMonth.value) || 1); }
function syncYearEnd() { if (state.fields.months && state.fields.months.toYearEnd) state.fields.months.value = monthsToYearEnd(); }
function relevantKeys(f) { return FIELD_ORDER.filter((k) => f[k] && (k !== 'holidayIncluded' || f.incomeType.value === 'wage') && (k !== 'startMonth' || !['date', 'picked'].includes(f.months.unit))); }
function reviewQueue() {
  const f = state.fields;
  return relevantKeys(f).filter((k) => f[k].status === STATUS.ESTIMATED && !state.reviewed.includes(k));
}
function missingFields() {
  const f = state.fields;
  const list = [];
  if (f.incomeType.value === 'unknown' && f.incomeType.evidence !== '모른다고 답함') list.push('incomeType');
  if (!f.startMonth.value) list.push('startMonth');
  if (!f.months.value) list.push('months');
  return list;
}
function beginReview() {
  state.reviewed = [];
  state.reviewTotal = reviewQueue().length + missingFields().length;
}

// 근거 문장 "원문 일부: 설명"에서 원문 부분을 원문 안에 형광펜으로 표시하고, 계산 과정을 한 줄로 보인다.
function evidenceHtml(f) {
  const ev = f.evidence || '';
  const cut = ev.indexOf(': ');
  const quote = cut > 0 ? ev.slice(0, cut) : ev;
  const explain = cut > 0 ? ev.slice(cut + 2) : '';
  let shown = '';
  // 공고 원문에서 찾은 문장만 "공고에 이렇게 적혀 있어요"로 보인다. 찾지 못하면 가정한 내용이라고 밝힌다.
  // 사진으로 올린 공고는 원문 글이 없어서 찾을 수 없으므로, AI가 사진에서 읽은 근거라고 밝힌다.
  const line = quote ? (state.rawText || '').split('\n').find((l) => l.includes(quote)) : null;
  if (quote && !line) return `<div class="quote"><p class="cap">${!state.rawText && state.extractedBy ? '사진에서 이렇게 읽었어요' : '공고에 없어 이렇게 가정했어요'}</p><p class="q">${esc(polite(ev))}</p></div>`;
  if (line) shown = esc(line).replace(esc(quote), `<mark>${esc(quote)}</mark>`);
  const m = explain.match(/하루\s*([\d.]+)시간\s*×\s*([\d.]+)일/);
  const calc = m ? `<div class="calc" aria-label="계산 과정"><span>하루 ${m[1]}시간</span>×<span>${m[2]}일</span>=<span class="res">${Number(m[1]) * Number(m[2])}시간</span></div>`
    : explain ? `<p class="gline center">${esc(explain)}</p>` : '';
  return (shown ? `<div class="quote"><p class="cap">공고에 이렇게 적혀 있어요</p><p class="q">${shown}</p></div>` : '') + calc;
}

// PC 읽은 조건: 공고 원문 전체에서 값마다 근거 문장을 찾아 형광펜으로 칠한다.
// 근거 전체("시급: 10,500원")가 원문에 있으면 그대로, 없으면 ': ' 앞부분(evidenceHtml과 같은 원문 일부)으로 찾는다. 겹치는 곳은 하나로 합친다.
function markedRaw(raw, f, keys) {
  const ranges = [];
  for (const k of keys) {
    const ev = (f[k] && f[k].evidence) || '';
    const tries = [ev];
    for (let i = ev.lastIndexOf(': '); i > 0; i = ev.lastIndexOf(': ', i - 1)) tries.push(ev.slice(0, i));
    const q = tries.find((t) => t.trim().length >= 2 && raw.includes(t));
    if (q) { const s = raw.indexOf(q); ranges.push([s, s + q.length]); }
  }
  ranges.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push([...r]);
  }
  let out = '';
  let at = 0;
  for (const [s, e] of merged) { out += `${esc(raw.slice(at, s))}<mark>${esc(raw.slice(s, e))}</mark>`; at = e; }
  return out + esc(raw.slice(at));
}

const QUESTIONS = {
  incomeType: { ask: '급여를 어떻게<br>받나요?', why: WHY.incomeType, options: [['wage', '4대보험 떼고 받아요'], ['business', '3.3% 떼고 받아요'], ['daily', '일당으로 그때그때 받아요'], ['unknown', '모르겠어요']] },
  startMonth: { ask: '몇 월부터<br>일하나요?', why: WHY.startMonth, options: Array.from({ length: 12 }, (_, i) => [String(i + 1), `${i + 1}월`]), grid: true },
  months: { ask: '몇 개월<br>일할 예정인가요?', why: WHY.months, options: [['1', '1개월'], ['2', '2개월'], ['3', '3개월'], ['6', '6개월'], ['end', '연말까지'], ['0', '모르겠어요'], ['day', '한 달보다 짧아요']], grid: true },
};

function viewConfirm() {
  const f = state.fields;
  const queue = reviewQueue();
  const missing = missingFields();
  const remaining = queue.length + missing.length;
  const n = Math.max(1, state.reviewTotal - remaining + 1);
  const total = Math.max(state.reviewTotal, n);
  // 질문 화면: PC에서는 왼쪽에 단계·질문·설명·'왜 물어보나요?', 오른쪽(.cb)에 고르는 버튼이나 공고 원문 인용·계산 과정
  if (queue.length) {
    const key = queue[0];
    // 답이 둘뿐인 주휴수당은 맞는지 묻지 않고 두 가지를 바로 보여 준다. 가정한 쪽이 먼저 골라져 있다.
    if (key === 'holidayIncluded') {
      const opt = (v, label) => `<button type="button" class="opt ${Boolean(f[key].value) === v ? 'on' : ''}" data-action="answer" data-key="holidayIncluded" data-value="${v}">${label}<i aria-hidden="true"></i></button>`;
      return {
        layout: 'c2',
        html: `<span class="step">확인 ${n} / ${total}</span>
          <h1 class="t2">주휴수당은<br>어떻게 받나요?</h1>
          <p class="sub">공고에 없어서 물어봐요. 모르면 '따로 받아요'로 계산해요</p>
          <div class="cb"><div class="opts">${opt(false, '시급과 따로 받아요')}${opt(true, '시급에 포함돼 있어요')}</div></div>
          ${why(WHY[key])}
          ${conditionsCard(key)}`,
      };
    }
    return {
      layout: 'c2',
      html: `<span class="step">확인 ${n} / ${total}</span>
        <h1 class="t2">${askText(key, f[key])}</h1>
        <div class="cb">${evidenceHtml(f[key])}</div>
        ${why(WHY[key])}
        ${conditionsCard(key)}`,
      bottom: two(weak('정보 수정할게요', 'editField', `data-key="${key}"`), cta('맞아요', 'reviewOk', `data-key="${key}"`)),
    };
  }
  if (missing.length) {
    const key = missing[0];
    const q = QUESTIONS[key];
    return {
      layout: 'c2',
      html: `<span class="step">확인 ${n} / ${total}</span>
        <h1 class="t2">${q.ask}</h1>
        <p class="sub">공고에 적혀 있지 않아서 물어봐요</p>
        <div class="cb"><div class="${q.grid ? 'grid3' : 'opts'}">${q.options.map(([v, l]) => `<button type="button" class="opt" data-action="answer" data-key="${key}" data-value="${v}">${esc(l)}</button>`).join('')}</div></div>
        ${why(q.why)}
        ${conditionsCard(key)}`,
    };
  }
  const keys = relevantKeys(f);
  const ready = f.hourlyWage.value > 0 && f.weeklyHours.value > 0;
  // 읽은 조건: PC에서는 왼쪽에 조건 목록, 오른쪽(.cb)에 점 설명과 공고 원문
  return {
    layout: 'c2',
    html: `<h1 class="t2 hd">이 조건으로<br>계산할게요</h1>
      ${state.extractedBy ? `<p class="gline hd">AI가 공고를 읽은 결과예요. 틀린 곳은 눌러서 고쳐 주세요</p>` : ''}
      <div class="rows kvs">${keys.map((k) => `<button type="button" class="kv" data-action="editField" data-key="${k}">
        <span class="k">${FIELD_NAME[k]}${f[k].status !== STATUS.CONFIRMED ? `<i class="dot ${f[k].status === STATUS.CHECK ? 'need' : ''}" aria-label="${f[k].status === STATUS.CHECK ? '확인 필요' : '공고를 읽고 계산한 값'}"></i>` : ''}</span>
        <span class="v num">${esc(valueText(k, f[k]))}${icon('ch')}</span></button>`).join('')}</div>
      <div class="cb">
      ${keys.some((k) => f[k].status === STATUS.ESTIMATED) ? `<p class="legend"><i class="dot"></i>${state.rawText ? '공고를 읽고 계산하거나 가정한 값이에요' : '넣지 않아 가정한 값이에요'}. 눌러서 고칠 수 있어요</p>` : ''}
      ${keys.some((k) => f[k].status === STATUS.CHECK) ? `<p class="legend"><i class="dot need"></i>${state.rawText ? '공고에 없어 모르는 값이에요' : '모른다고 답한 값이에요'}. 사장님께 물어보면 좋아요</p>` : ''}
      ${state.rawText ? `<div class="quote raw-full pc-only"><p class="cap">공고에 이렇게 적혀 있어요</p><p class="q">${markedRaw(state.rawText, f, keys)}</p></div>
      <details class="raw-box m-only"><summary>공고 원문 보기</summary><pre>${esc(state.rawText)}</pre></details>` : ''}
      ${ready ? '' : '<p class="gline warn" role="alert">시급과 일하는 시간을 넣어야 다음으로 갈 수 있어요</p>'}
      </div>`,
    bottom: state.editing !== null
      ? cta('이 조건으로 저장하기', 'saveDraft', ready ? '' : 'disabled')
      : two(weak('제안 더하기', 'saveAndAdd', ready && state.offers.length < MAX_OFFERS - 1 ? '' : 'disabled'), cta('내 상황 입력하기', 'saveDraft', ready ? '' : 'disabled')),
  };
}

function offerLine(f) {
  const when = f.months.unit === 'date' ? spanText(f.months.start, f.months.end) : f.months.unit === 'picked' ? valueText('months', f.months) : `${f.startMonth.value}월부터 ${valueText('months', f.months)}`;
  return `시급 ${won(f.hourlyWage.value)} · ${valueText('weeklyHours', f.weeklyHours)} · ${when}`;
}
// PC 질문 화면 왼쪽 칸 아래 '계산할 조건'(휴대폰에서는 숨김). 내 상황 질문은 저장한 제안(offerLine, 여러 개면 이름과 함께 3개까지),
// 조건 확인 질문은 지금 고치는 값(FIELD_NAME + valueText, 모르는 값은 '모름')을 보인다. 묻고 있는 줄(askingKey)은 굵게.
function conditionsCard(askingKey = null) {
  let body = '';
  if (state.step === 'profile') {
    const list = state.offers.slice(0, MAX_OFFERS);
    body = list.map((o) => `<p class="cc-offer">${list.length > 1 ? `<b>${esc(o.name)}</b>` : ''}<span class="num">${esc(offerLine(o.fields))}</span></p>`).join('');
  } else if (state.fields) {
    const f = state.fields;
    body = `<dl class="cc-rows">${relevantKeys(f).map((k) => `<div class="${k === askingKey ? 'on' : ''}"><dt>${FIELD_NAME[k]}</dt><dd class="num">${esc(valueText(k, f[k]))}</dd></div>`).join('')}</dl>`;
  }
  return body ? `<section class="cond-card pc-only" aria-label="계산할 조건"><p class="cc-title" aria-hidden="true">계산할 조건</p>${body}</section>` : '';
}

// 기간을 일수로 넣었으면 days로, 날짜로 넣었으면 startDate·endDate로 넘긴다. 계산은 그 기간 동안의 돈으로 한다.
// 요일을 넣었으면 workDays로 넘겨, 날짜로 넣은 기간에서 실제 근무일을 센다.
function jobOf(f) {
  const unit = f.months.unit;
  const w = f.weeklyHours;
  return {
    hourlyWage: Number(f.hourlyWage.value),
    weeklyHours: Number(w.value),
    startMonth: unit === 'date' ? Number(f.months.start.slice(5, 7)) : unit === 'picked' ? Number(f.months.dates[0].slice(5, 7)) : Number(f.startMonth.value),
    months: unit === 'day' || unit === 'date' || unit === 'picked' ? 1 : f.months.toYearEnd ? 13 - (Number(f.startMonth.value) || 1) : Number(f.months.value),
    ...(unit === 'day' ? { days: Number(f.months.value) } : {}),
    ...(unit === 'date' ? { startDate: f.months.start, endDate: f.months.end } : {}),
    // 매주 같은 요일이면 요일로 실제 근무일을 세고, 날짜를 골랐으면 고른 날 × 하루 시간으로 계산한다.
    ...(w.how === 'pattern' && w.sched ? { workDays: w.sched.days } : {}),
    ...(unit === 'picked' ? { workDates: f.months.dates, dailyHours: w.daily } : {}),
    incomeType: f.incomeType.value,
    holidayIncluded: Boolean(f.holidayIncluded && f.holidayIncluded.value),
  };
}
// 금액 앞에 붙이는 기간 말. 일수나 날짜로 넣은 제안은 한 달이 아니라 그 기간 동안의 돈이다.
// 해를 넘기는 기간은 금액이 올해 부분만이라 올해 안의 기간(countedLabel)을 쓴다.
function periodOf(s) { return s && s.days ? `${s.days}일` : s && s.span ? (s.span.countedLabel || s.span.label) : null; }
function perLong(s) { const p = periodOf(s); return p ? `${p} 동안` : '한 달에'; }
function perShort(s) { const p = periodOf(s); return p ? `${p} 동안` : '한 달'; }
// 주휴수당 항목은 근로소득일 때만 의미가 있어, 그 밖에는 확인 안 된 조건으로 세지 않는다.
function metaOf(f) {
  return Object.fromEntries(Object.entries(f).filter(([k]) => k !== 'holidayIncluded' || f.incomeType.value === 'wage').map(([k, v]) => [k, v.status]));
}

// 확인을 마친 제안을 목록에 넣는다. 수정 중이던 제안이면 그 자리에 덮어쓴다.
function saveDraft() {
  const draft = { fields: state.fields, rawText: state.rawText, extractedBy: state.extractedBy || null };
  if (state.editing !== null && state.offers[state.editing]) {
    state.offers[state.editing] = { ...state.offers[state.editing], ...draft };
  } else {
    const name = state.sample ? SAMPLE_TEXT[state.sample][0] : `제안 ${state.offers.length + 1}`;
    state.offers.push({ name, ...draft });
  }
  Object.assign(state, { editing: null, fields: null, rawText: '', sample: null, extractedBy: null });
}

function viewOffers() {
  const cards = state.offers.map((o, i) => `<div class="card offer">
      <label class="sr-only" for="name-${i}">제안 이름</label>
      <input id="name-${i}" class="name-in" type="text" maxlength="20" data-offer-name="${i}" value="${esc(o.name)}">
      <p class="gline num">${esc(offerLine(o.fields))}</p>
      <div class="acts"><button type="button" data-action="editOffer" data-i="${i}">고치기</button><button type="button" data-action="removeOffer" data-i="${i}">지우기</button></div>
    </div>`).join('');
  const canAdd = state.offers.length < MAX_OFFERS;
  const add = canAdd ? '<button type="button" class="add" data-action="addOffer">＋ 비교할 제안 더하기</button>' : '';
  // PC에서는 제안 카드와 '비교할 제안 더하기'를 한 줄에 나란히 둔다(.offer-grid). 휴대폰은 위아래 그대로다.
  return {
    // 제안을 모두 지웠으면 '제안 0개를 저장했어요' 대신 없다고 말하고 무엇을 누르면 되는지 알려 준다.
    html: `<h1 class="t2">${state.offers.length ? `<mark>제안 ${state.offers.length}개</mark>를<br>저장했어요` : '저장한 제안이<br><mark>없어요</mark>'}</h1>
      ${cards ? `<div class="offer-grid">${cards}${add}</div>` : `<p class="gline">아래 '비교할 제안 더하기'를 눌러 공고를 올려 주세요</p>${add}`}
      <p class="gline">제안은 ${MAX_OFFERS}개까지 나란히 비교할 수 있어요</p>`,
    bottom: cta('내 상황 입력하기', 'go', `data-step="profile" ${state.offers.length ? '' : 'disabled'}`),
  };
}

// ---------------- 내 상황 (한 화면에 질문 하나) ----------------

function profileQuestions() {
  const age = state.profile.age;
  const maxAge = state.rules.dependentDeduction.impact.basicDeductionMaxAge;
  return ['maxHours', 'allowance', 'age', 'parents', 'ytd', 'others'].map((q) => ({ q, askTax: age == null || age <= maxAge }));
}

// 숫자 칸 폭을 들어 있는 자릿수에 맞춘다. 칸이 넓고 숫자가 오른쪽에 붙어 있으면 "27 살"이 −와 + 사이 가운데에서 오른쪽으로 치우친다.
const numWidth = (v) => `calc(${Math.max(1, String(v ?? '').length)}ch + 2px)`;
function fitNum(input) { input.style.width = numWidth(input.value); }
// cap을 주면 그보다 큰 수는 칠 수 없다(자릿수를 넘는 글자는 버리고, 넘는 값은 cap으로). 만 나이는 99까지.
function stepper(id, value, unit, min, max, cap = null) {
  return `<div class="stepper">
    <button type="button" class="sb" data-action="step" data-target="${id}" data-delta="-1" aria-label="1 줄이기">−</button>
    <label class="sv"><span class="sr-only">${unit} 입력</span><input id="${id}" type="number" inputmode="numeric" min="${min}" max="${max}" ${cap ? `data-cap="${cap}"` : ''} value="${value ?? ''}" placeholder="0" style="width:${numWidth(value)}"><span>${unit}</span></label>
    <button type="button" class="sb" data-action="step" data-target="${id}" data-delta="1" aria-label="1 늘리기">+</button>
  </div>`;
}
function optBtn(name, value, label, current) {
  const on = String(current) === String(value);
  return `<button type="button" class="opt ${on ? 'on' : ''}" data-action="choose" data-name="${name}" data-value="${value}" aria-pressed="${on}">${esc(label)}<i aria-hidden="true"></i></button>`;
}
function segBtn(name, value, label, current) {
  const on = String(current) === String(value);
  return `<button type="button" class="seg-b ${on ? 'on' : ''}" data-action="choose" data-name="${name}" data-value="${value}" aria-pressed="${on}">${esc(label)}</button>`;
}

// 수당이 끝나는 날을 하루 고르는 달력. 직접 입력의 달력(calendarHtml)과 같은 모양이고, 올해(appliesToYear) 1~12월만 둔다.
// 계산은 지금처럼 달 기준이다(구직촉진수당은 날수로 나누는 규정이 없다). 그래서 고른 날의 달을 ...EndMonth에 넣고,
// 고른 날짜는 화면에 다시 보여 주려고 ...EndDate에 따로 둔다. 예전에 달만 저장한 값은 그 달을 펼쳐 두고 같은 결과로 계산한다.
const END_DATE = { allowanceEndMonth: 'allowanceEndDate', unemploymentEndMonth: 'unemploymentEndDate' };
function endDateOf(name) {
  const d = state.profile[END_DATE[name]];
  const m = state.profile[name];
  return typeof d === 'string' && typeof m === 'number' && Number(d.slice(5, 7)) === m ? d : null;
}
// 달력에 펼칠 달: 넘겨 본 달 → 고른 날의 달 → 저장된 달 → 이번 달(올해가 아니면 1월)
function endCalMonth(name) {
  const p = state.profile;
  const basis = `${p[name]}|${endDateOf(name) || ''}`;
  const seen = state.endCal && state.endCal[name];
  if (seen && seen.basis === basis) return seen.mo;
  const d = endDateOf(name);
  if (d) return Number(d.slice(5, 7));
  if (typeof p[name] === 'number') return p[name];
  const year = state.rules.appliesToYear;
  const now = new Date();
  return now.getFullYear() === year ? now.getMonth() + 1 : 1;
}
function endDateCal(name, labelId) {
  const year = state.rules.appliesToYear;
  const mo = endCalMonth(name);
  const picked = endDateOf(name);
  const month = state.profile[name];
  const lead = (new Date(Date.UTC(year, mo - 1, 1)).getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(year, mo, 0)).getUTCDate();
  const cells = Array.from({ length: lead }, () => '<span class="cal-e" aria-hidden="true"></span>');
  for (let d = 1; d <= daysIn; d++) {
    const v = isoDate(year, mo, d);
    const on = picked === v;
    const wd = new Date(Date.UTC(year, mo - 1, d)).getUTCDay();
    cells.push(`<button type="button" class="cal-d ${on ? 'on' : ''} ${wd === 0 || wd === 6 ? 'we' : ''}" data-action="endDay" data-name="${name}" data-value="${v}" aria-pressed="${on}" aria-label="${mo}월 ${d}일 ${WEEKDAY[wd]}요일">${d}</button>`);
  }
  // 구직촉진수당은 계산에, 실업급여는 안내에만 쓴다(실업급여 금액은 계산하지 않는다).
  const use = (m) => (name === 'allowanceEndMonth' ? `${m}월까지 받는 것으로 계산해요` : `${m}월에 끝나는 것으로 알려 드려요`);
  let note = '끝나는 날을 눌러 골라 주세요';
  if (picked) {
    const pm = Number(picked.slice(5, 7));
    const pd = Number(picked.slice(8, 10));
    note = `${pm}월 ${pd}일 ${WEEKDAY[new Date(Date.UTC(year, pm - 1, pd)).getUTCDay()]}요일까지 받아요. ${use(pm)}`;
  } else if (typeof month === 'number') note = `지금은 ${use(month)}. 끝나는 날을 누르면 그날로 바뀌어요`;
  const unknown = !picked && typeof month !== 'number';
  // 달력은 올해만 있어 내년에 끝나는 사람은 고를 날이 없다. 계산은 올해(1~12월)만 하므로
  // 구직촉진수당은 12월 31일을 고르면 '모르겠어요'와 같은 금액이 나오고 '확인 필요'가 붙지 않는다.
  // 실업급여는 12월로 고르면 '그 뒤로는 줄어들 실업급여가 없음'으로 잘못 알리게 되어 '모르겠어요'를 고르게 한다.
  const nextYear = name === 'allowanceEndMonth'
    ? `${year + 1}년에 끝나면 <b>12월 31일</b>을 골라 주세요. ${year}년은 끝까지 받는 것으로 계산해요`
    : `${year + 1}년에 끝나면 <b>모르겠어요</b>를 골라 주세요`;
  return `<div class="cal one" role="group" aria-labelledby="${labelId}">
    <div class="cal-h">
      <button type="button" class="cal-nav" data-action="endMove" data-name="${name}" data-value="-1" aria-label="이전 달" ${mo <= 1 ? 'disabled' : ''}>${icon('back')}</button>
      <b aria-live="polite">${year}년 ${mo}월</b>
      <button type="button" class="cal-nav" data-action="endMove" data-name="${name}" data-value="1" aria-label="다음 달" ${mo >= 12 ? 'disabled' : ''}>${icon('ch')}</button>
    </div>
    <div class="cal-g" role="group" aria-label="${mo}월 날짜">${WEEK_ORDER.map((d) => `<span class="dow ${d === 0 || d === 6 ? 'we' : ''}" aria-hidden="true">${WEEKDAY[d]}</span>`).join('')}${cells.join('')}</div>
    <p class="gline">${note}</p>
    <p class="gline ny">${nextYear}</p>
  </div><div class="grid1"><button type="button" class="opt c ${unknown ? 'on' : ''}" data-action="choose" data-name="${name}" data-value="unknown" aria-pressed="${unknown}">모르겠어요</button></div>`;
}

function viewProfile() {
  const p = state.profile;
  const qs = profileQuestions();
  const i = Math.min(state.profileQ, qs.length - 1);
  const { q, askTax } = qs[i];
  const head = `<span class="step">질문 ${i + 1} / ${qs.length}</span>`;
  const card = conditionsCard();
  const next = i === qs.length - 1 ? cta('결과 보기', 'calculate') : cta('다음', 'nextQ');
  // PC에서는 왼쪽에 단계·질문·'왜 물어보나요?', 오른쪽(.cb)에 답하는 칸. 휴대폰은 마크업 순서 그대로 위에서 아래로.
  if (q === 'maxHours') {
    const longest = Math.max(0, ...state.offers.map((o) => Number(o.fields.weeklyHours.value) || 0));
    const over = p.maxHours && longest > p.maxHours;
    return {
      layout: 'c2',
      html: `${head}<h1 class="t2">일주일에 <mark>최대 몇 시간</mark><br>일할 수 있나요?</h1>
        <div class="cb">
        ${stepper('p-max', p.maxHours, '시간', 1, 52)}
        <div class="chips center">${[15, 20, 30, 40].map((h) => `<button type="button" data-action="setNum" data-target="p-max" data-value="${h}">${h}시간</button>`).join('')}</div>
        ${state.profileError ? `<p class="gline warn" role="alert">${esc(state.profileError)}</p>` : ''}
        ${over ? `<p class="gline">받은 제안(주 ${longest}시간)이 이 시간을 넘어요. 그 제안은 "할 수 있는 시간 초과"로 표시돼요</p>` : ''}
        </div>
        ${why('이 시간 안에서만 근무조건을 비교해요. 수업이나 훈련 시간은 빼고 알려 주세요.')}
        ${card}`,
      bottom: next,
    };
  }
  if (q === 'allowance') {
    return {
      layout: 'c2',
      html: `${head}<h1 class="t2"><mark>구직촉진수당</mark>을<br>받고 있나요?</h1>
        <div class="cb">
        <div class="opts">${optBtn('allowance', 'yes', '받고 있어요', p.allowance)}${optBtn('allowance', 'applying', '신청했어요', p.allowance)}${optBtn('allowance', 'no', '안 받아요', p.allowance)}</div>
        ${p.allowance !== 'no' ? `<p class="lbl" id="lbl-allowance-end">언제까지 받나요?</p>${endDateCal('allowanceEndMonth', 'lbl-allowance-end')}
          <p class="gline">구직촉진수당은 최대 6개월 받아요. 끝나는 날은 고용24나 고용센터(1350)에서 확인할 수 있어요</p>` : ''}
        </div>
        ${why('수당을 받는 동안 돈을 벌면 수당이 줄 수 있어요. 끝나는 날을 알면 그다음 달부터는 줄어드는 돈 없이 계산해요.')}
        ${card}`,
      bottom: next,
    };
  }
  if (q === 'age') {
    return {
      layout: 'c2',
      html: `${head}<h1 class="t2"><mark>만 나이</mark>가<br>어떻게 되나요?</h1>
        <div class="cb">
        ${stepper('p-age', p.age, '살', 15, 99, 99)}
        ${state.profileError ? `<p class="gline warn" role="alert">${esc(state.profileError)}</p>` : ''}
        </div>
        ${why('부모님 세금 공제는 자녀가 만 20세 이하일 때만 받을 수 있어요. 21세 이상이면 다음 질문에서 세금은 묻지 않고 건강보험만 물어봐요.')}
        ${card}`,
      bottom: next,
    };
  }
  if (q === 'parents') {
    const maxAge = state.rules.dependentDeduction.impact.basicDeductionMaxAge;
    return {
      layout: 'c2',
      html: `${head}<h1 class="t2">부모님 <mark>${askTax ? '보험과 세금' : '건강보험'}</mark>에<br>올라 있나요?</h1>
        <div class="cb">
        <p class="lbl">부모님 건강보험에 피부양자로 올라 있어요</p>
        <div class="seg3">${segBtn('healthDependent', 'yes', '네', p.healthDependent)}${segBtn('healthDependent', 'no', '아니요', p.healthDependent)}${segBtn('healthDependent', 'unknown', '모르겠어요', p.healthDependent)}</div>
        ${p.healthDependent === 'unknown' ? `<div class="help">
          <p><b>바로 확인할 수 있어요</b>건강보험 자격득실확인서에서 "피부양자"로 나오면 올라 있는 거예요. 간편인증으로 1~2분 걸려요.</p>
          <a href="${LINKS.gov24Health}" target="_blank" rel="noopener">${icon('link')}정부24에서 확인하기</a>
          <a href="${LINKS.nhisHealth}" target="_blank" rel="noopener">${icon('link')}건강보험공단에서 확인하기</a>
          <p class="gline">새 탭으로 열려요. 돌아와도 입력한 내용은 그대로예요</p>
        </div>` : ''}
        ${askTax ? `<p class="lbl">부모님 연말정산에 부양가족으로 올라 있어요</p>
        <div class="seg3">${segBtn('taxDependent', 'yes', '네', p.taxDependent)}${segBtn('taxDependent', 'no', '아니요', p.taxDependent)}${segBtn('taxDependent', 'unknown', '모르겠어요', p.taxDependent)}</div>
        ${p.taxDependent === 'unknown' ? '<p class="gline">부모님 연말정산 서류에 나와요. 부모님께 여쭤보세요</p>' : ''}`
        : `<p class="gline">만 ${maxAge}세를 넘어서 부모님 세금 공제는 묻지 않아요. 건강보험 피부양자는 나이가 아니라 소득으로 정해져서 물어봐요</p>`}
        </div>
        ${why('돈을 벌면 부모님 보험이나 세금이 달라질 수 있어요. 모르면 올라 있다고 보고 계산하고 "확인 필요"로 표시해요.')}
        ${card}`,
      bottom: next,
    };
  }
  if (q === 'ytd') {
    const has = state.ytdOpen || (p.ytdIncome.wage + p.ytdIncome.business + p.ytdIncome.daily) > 0;
    // '있어요'인데 세 칸이 모두 빈 채로 '다음'을 누르면: 안내를 고르는 버튼 바로 아래(첫 칸 위)에 두고, 세 칸에 빨간 테두리와
    // aria-invalid를 붙이며, 칸마다 안내를 설명으로 이어 화면 읽기 프로그램이 칸에 들어갈 때도 읽게 한다.
    const err = has && state.profileError;
    // 음수 안내일 때는 음수가 든 칸만, 빈칸 안내일 때는 세 칸 모두 표시한다.
    const neg = ['wage', 'business', 'daily'].filter((k) => p.ytdIncome[k] < 0);
    const ytdAttrs = (id) => { const on = err && (!neg.length || neg.includes(id.slice(2))); return `aria-describedby="${id}-h${on ? ' y-err' : ''}"${on ? ' aria-invalid="true"' : ''}`; };
    return {
      layout: 'c2',
      html: `${head}<h1 class="t2">올해 <mark>이미 번 돈</mark>이<br>있나요?</h1>
        <div class="cb">
        <div class="opts"><button type="button" class="opt ${has ? '' : 'on'}" data-action="ytd" data-value="no" aria-pressed="${!has}">없어요<i aria-hidden="true"></i></button><button type="button" class="opt ${has ? 'on' : ''}" data-action="ytd" data-value="yes" aria-pressed="${has}">있어요<i aria-hidden="true"></i></button></div>
        ${err ? `<p class="gline warn" id="y-err" role="alert">${esc(state.profileError)}</p>` : ''}
        ${has ? `<div class="form">
          <label for="y-wage">월급으로 받은 돈</label><p class="gline hint" id="y-wage-h">4대보험을 떼기 전 금액이에요. 급여명세서의 '지급 합계'를 적어요</p><div class="unit"><input id="y-wage" type="number" inputmode="numeric" min="0" value="${p.ytdIncome.wage || ''}" placeholder="0" ${ytdAttrs('y-wage')}><span>원</span></div>
          <label for="y-business">3.3% 떼는 일로 받은 돈</label><p class="gline hint" id="y-business-h">3.3%를 떼기 전 금액이에요. 통장에 96만 7천 원이 들어왔다면 100만 원을 적어요</p><div class="unit"><input id="y-business" type="number" inputmode="numeric" min="0" value="${p.ytdIncome.business || ''}" placeholder="0" ${ytdAttrs('y-business')}><span>원</span></div>
          <label for="y-daily">일당으로 받은 돈</label><p class="gline hint" id="y-daily-h">하루 단위로 받은 돈을 모두 더해 적어요</p><div class="unit"><input id="y-daily" type="number" inputmode="numeric" min="0" value="${p.ytdIncome.daily || ''}" placeholder="0" ${ytdAttrs('y-daily')}><span>원</span></div>
        </div>` : ''}
        </div>
        ${why('1년 기준은 올해 번 돈을 모두 더해서 봐요.')}
        ${card}`,
      bottom: next,
    };
  }
  const others = Object.entries(state.rules.outOfScope);
  const none = !(p.otherSupports || []).length;
  // 마지막 설명 줄은 휴대폰에서는 맨 아래, PC에서는 왼쪽 칸 질문 아래에 놓인다.
  return {
    layout: 'c2',
    html: `${head}<h1 class="t2"><mark>다른 지원</mark>도<br>받고 있나요?</h1>
      <div class="cb">
      <div class="grid2">${others.map(([k, v]) => { const on = (p.otherSupports || []).includes(k); return `<button type="button" class="opt c ${on ? 'on' : ''}" data-action="choose" data-name="otherSupports" data-multi="1" data-value="${k}" aria-pressed="${on}">${esc(v.title)}</button>`; }).join('')}
        <button type="button" class="opt c ${none ? 'on' : ''}" data-action="noSupports" aria-pressed="${none}">없어요</button></div>
      ${(p.otherSupports || []).includes('unemploymentBenefit') ? `<p class="lbl" id="lbl-unemployment-end">실업급여는 언제까지 받나요?</p>${endDateCal('unemploymentEndMonth', 'lbl-unemployment-end')}
        <p class="gline">끝나는 날을 알면, 그다음 달부터는 줄어들 실업급여가 없다는 것까지 알려 드려요</p>` : ''}
      </div>
      <p class="gline">여러 개 고를 수 있어요. 이 지원들은 계산하지 않고 물어볼 곳만 알려 드려요</p>
      ${card}`,
    bottom: next,
  };
}

// ---------------- 결과 ----------------

function shortHealth(c) {
  if (c.crossed) return c.headline.startsWith('한 달') ? ['부모님 건강보험 피부양자에서 빠져요', '한 달 60시간 이상 일하면 직장가입자가 돼요'] : ['부모님 건강보험 피부양자에서 빠져요', `${c.crossMonth}월에 연 소득 기준을 넘어요`];
  return null;
}
// 카드를 쉬운 말 한 줄로 바꾼다. [아이콘, 색, 제목, 설명, 상태 표시]
function cardLine(c) {
  const name = { dependentDeduction: '부모님 세금 공제', healthDependent: '부모님 건강보험', jobSeekerAllowance: '구직촉진수당', weekly15h: '주휴수당 · 4대보험' }[c.id];
  const hold = c.crossed === null;
  if (hold) {
    const pending = c.pending;
    return ['hold', 'gray', name, pending ? esc(polite((c.checks && c.checks[0]) || c.headline)) : '급여를 어떻게 받는지 알아야 계산할 수 있어요', pending ? tag(STATUS.CHECK) : '<span class="tagm hold">계산 보류</span>'];
  }
  let st = c.status !== STATUS.CONFIRMED ? tag(c.status) : '';
  // 기준을 넘지 않았어도 원문 확인이 필요한 항목이 있으면 그대로라고 단정하지 않는다.
  if (!c.crossed && (c.checks || []).length && (c.id === 'healthDependent' || c.id === 'dependentDeduction')) {
    return ['hold', 'gray', name, esc(polite(c.checks[0])), tag(STATUS.CHECK), true];
  }
  if (c.id === 'jobSeekerAllowance') {
    // 일수로 넣은 짧은 일은 취업으로 보아 수당이 끝나는지 확인 전이라 "확인 필요"를 붙인다.
    if (state.result.pay.shortJobDays && (c.checks || []).length) st = tag(STATUS.CHECK);
    if (c.beforeStart) return ['same', 'gray', '구직촉진수당은 일을 시작하기 전에 끝나요', `${c.endMonth}월까지 받아서 줄어드는 수당이 없어요`, st];
    if (c.ended) return ['down', 'red', '구직촉진수당이 끊겨요', '주 30시간 이상 일자리는 취업으로 봐요', st];
    // 날짜로 넣은 기간: 수당은 달마다 그 달에 번 돈으로 줄어들어 기간 합계로 보여 준다.
    if (c.crossed && state.result.summary.span) {
      const l = manParts(state.result.summary).loss;
      const until = c.endMonth && c.endMonth < state.result.timeline.end ? `${c.endMonth}월까지 줄고, 그 뒤로는 수당이 끝나요` : c.paid === 0 ? '수당을 받지 못하는 달이 있어요. 달마다 번 돈에 따라 달라져요' : '달마다 번 돈에 따라 줄어드는 금액이 달라요';
      return ['down', 'red', `구직촉진수당이 기간 동안 ${l ? l.toLocaleString('ko-KR') + '만 원' : won(c.totalLoss)}쯤 줄어요`, until, st];
    }
    if (c.crossed && c.paid === 0) return ['down', 'red', '그 달 구직촉진수당을 받지 못해요', `한 달에 ${won(c.flatZone.to)} 이상 벌면 0원이에요`, st];
    if (c.crossed) { const l = manParts(state.result.summary).loss; const until = c.endMonth && c.endMonth < state.result.timeline.end ? `${c.endMonth}월까지 줄고, 그 뒤로는 수당이 끝나요` : `한 달 ${won(c.flatZone.from)}까지는 전액, 넘으면 줄어요`; const amount = l ? l.toLocaleString('ko-KR') + '만 원' : won(c.impact.max); return ['down', 'red', state.result.summary.days ? `${state.result.timeline.start}월 구직촉진수당이 ${amount}쯤 줄어요` : `구직촉진수당이 월 ${amount}쯤 줄어요`, until, st]; }
    return ['same', 'gray', '구직촉진수당은 그대로예요', `한 달에 ${won(c.flatZone.from)}까지 벌면 전액 받아요`, st];
  }
  if (c.id === 'healthDependent') {
    const h = shortHealth(c);
    if (h) return ['down', 'red', h[0], h[1], st];
    return ['same', 'gray', '부모님 건강보험 피부양자는 그대로예요', '연 소득 2,000만 원 이하예요', st];
  }
  if (c.id === 'dependentDeduction') {
    if (c.crossed) return ['down', 'red', '부모님 세금 공제 대상에서 빠져요', `${c.crossMonth}월에 연 총급여 500만 원을 넘어요`, st];
    return ['same', 'gray', '부모님 세금 공제는 그대로예요', '연 소득 기준을 넘지 않아요', st];
  }
  // 일수로 넣은 짧은 일은 4대보험 가입 여부를 확인 전이라 가입된다고 단정하지 않는다.
  const shortPay = state.result && state.result.pay.shortJobDays ? state.result.pay : null;
  if (c.crossed && shortPay) {
    const ins = '4대보험은 일하는 기간이 짧아 가입하는지 확인이 필요해요';
    if (c.holidayIncluded) return ['same', 'gray', '주휴수당은 시급에 포함돼 있어요', ins, tag(STATUS.CHECK)];
    if (shortPay.holidayPay) return ['plus', 'green', '주휴수당이 생겨요', ins, tag(STATUS.CHECK)];
    return ['same', 'gray', '주휴수당은 없어요', `한 주를 다 채우지 않아서예요. ${ins}`, tag(STATUS.CHECK)];
  }
  if (c.crossed) return ['plus', 'green', c.holidayIncluded ? '4대보험에 가입돼요' : '주휴수당과 4대보험이 생겨요', c.holidayIncluded ? '주휴수당은 시급에 포함된 것으로 계산했어요' : '일주일에 15시간 이상이라서예요', st];
  if (c.employmentOnly) return ['plus', 'green', '고용보험에 가입돼요', '3개월 이상 일하면 주 15시간 미만이어도 가입해요', st];
  return null;
}

// 근무조건 비교 결과에서 가장 뜻있는 한 가지를 한 문장으로. 추천이 아니라 비교 기준이다.
function allowanceUntil() {
  // 일수·날짜로 넣은 제안의 금액은 기간 전체 합계라 'N월까지 기준'을 붙이지 않는다(수당이 끝난 뒤 달도 합계에 들어 있다).
  if (!state.result || periodOf(state.result.summary)) return null;
  const c = state.result && state.result.cards.find((x) => x.id === 'jobSeekerAllowance');
  return c && c.endMonth && !c.beforeStart && c.endMonth < state.result.timeline.end ? c.endMonth : null;
}
// 결과 화면의 "근무시간을 바꾸면" 카드. 할 수 있는 시간 전체에서 가장 많이 남는 시간을 보여 준다.
// 시간을 줄이라고 권하지 않고, 어느 시간이 가장 많이 남는지와 그때 지원이 어떻게 되는지만 알려 준다.
function betterOptionAll() {
  const a = state.alts;
  if (!a || a.offeredOutOfRange || !a.best) return null;
  const at = (h) => a.table.find((t) => t.weeklyHours === h);
  const cur = at(a.offered);
  if (!cur || cur.pendingIds.length) return null;
  const best = at(a.best.weeklyHours);
  if (best.weeklyHours === a.offered || best.net <= cur.net) {
    return { hours: null, title: '할 수 있는 시간 안에서는 지금 조건이 가장 많이 남아요', sub: '근무시간을 바꾸면 어떻게 달라지는지 볼 수 있어요' };
  }
  const diff = best.weeklyHours - a.offered;
  const support = best.allowanceEnded && !cur.allowanceEnded ? ' 구직촉진수당이 끊겨요'
    : best.allowanceLoss > cur.allowanceLoss ? (cur.allowanceLoss > 0 ? ' 구직촉진수당은 더 줄어요' : ' 구직촉진수당은 줄어요')
      : best.allowanceLoss < cur.allowanceLoss ? (best.allowanceLoss === 0 ? ' 구직촉진수당은 줄지 않아요' : ' 구직촉진수당은 덜 줄어요') : '';
  const until = allowanceUntil();
  return {
    hours: best.weeklyHours,
    title: `주 ${best.weeklyHours}시간이면 ${manOrWon(best.net - cur.net)} 더 남아요`,
    sub: `일하는 시간이 ${Math.abs(diff)}시간 ${diff > 0 ? '늘고' : '줄고'}, ${perLong(state.result && state.result.summary)} ${man(best.net)}이 남아요${until ? `(${until}월까지 기준)` : ''}.${support}`,
  };
}

// 두 번째 추천: 구직촉진수당이 끊기지 않는 시간 중 가장 많이 남는 시간. 첫 추천(가장 많이 남는 시간)이 수당을 끊을 때만 뜻이 있어서,
// 첫 추천·받은 제안과 같은 시간이거나 받은 제안보다 남는 돈이 적거나, 수당을 받지 않으면 두지 않는다.
function keepAllowanceOption() {
  const a = state.alts;
  if (!a || a.offeredOutOfRange || !a.best || state.profile.allowance === 'no') return null;
  const at = (h) => a.table.find((t) => t.weeklyHours === h);
  const cur = at(a.offered);
  if (!cur || cur.pendingIds.length) return null;
  const ok = a.table.filter((t) => !t.allowanceEnded && !t.pendingIds.length);
  if (!ok.length) return null;
  const k = ok.reduce((x, y) => (y.net > x.net ? y : x));
  if (k.weeklyHours === a.best.weeklyHours || k.weeklyHours === a.offered || k.net <= cur.net) return null;
  const diff = k.weeklyHours - a.offered;
  const until = allowanceUntil();
  return {
    hours: k.weeklyHours,
    title: `주 ${k.weeklyHours}시간이면 ${manOrWon(k.net - cur.net)} 더 남아요`,
    sub: `일하는 시간이 ${Math.abs(diff)}시간 ${diff > 0 ? '늘고' : '줄고'}, ${perLong(state.result && state.result.summary)} ${man(k.net)}이 남아요${until ? `(${until}월까지 기준)` : ''}. ${k.allowanceLoss > 0 ? '구직촉진수당은 줄지만 끊기지 않아요' : '구직촉진수당은 줄지 않아요'}`,
  };
}
// 결과 화면의 추천 카드. 추천이 둘이면 작은 제목으로 무엇을 기준으로 골랐는지 나눈다.
function betterCards(better, keepOpt) {
  const card = (o, label) => `<button type="button" class="better" data-action="${o.hours ? 'altsAt' : 'go'}" ${o.hours ? `data-hours="${o.hours}"` : 'data-step="alts"'}>
        <span class="tx"><small>${label}</small><b>${esc(o.title)}</b><span>${esc(o.sub)}</span></span>${icon('ch')}</button>`;
  if (!better) return '';
  if (!keepOpt) return card(better, '근무시간을 바꾸면');
  return card(better, '가장 많이 남는 시간') + card(keepOpt, '구직촉진수당을 지키면서');
}

function resultTitle(r, job) {
  const s = r.summary;
  if (s.net <= 0 && s.addedIncome > 0) {
    return `<h1 class="t2 res">일해도 ${periodOf(s) ? '' : '한 달에 '}<br><mark class="rd">남는 돈이 없어요</mark></h1>
      <p class="cut">버는 돈 <b class="num">${man(s.addedIncome)}</b>보다 빠지는 돈이 더 커요</p>`;
  }
  const mp = manParts(s);
  // 기간이 날짜로 길게 적히면 기간 뒤에서 줄을 바꿔, 큰 숫자가 두 줄로 갈라지지 않게 한다.
  const lead = `${perLong(s)}${periodOf(s) ? '<br>' : ' '}`;
  // 급여를 어떻게 받는지 모르면 보험료·세금을 뺄 수 없어 "남아요"라고 하지 않는다.
  if (job.incomeType === 'unknown') return `<h1 class="t2 res">${lead}<mark class="num kn">${countNum(mp.gross)}만 원</mark>을<br>받아요</h1>`;
  if (s.allowanceLoss > 0) {
    const ended = state.result.cards.some((c) => c.ended);
    return `<h1 class="t2 res">${periodOf(s) ? `${periodOf(s)} 동안<br>` : '한 달에<br>'}<span class="num">${mp.gross.toLocaleString('ko-KR')}만 원</span>을 벌지만<br>실제로 남는 돈은<br><mark class="num kn">${countNum(mp.kept)}만 원</mark>이에요</h1>
      <p class="cut">${mp.deduct ? '보험료와 ' : ''}${ended ? '끊기는' : '줄어드는'} 정부 지원으로 <mark class="rd"><b class="num">${(mp.deduct + mp.loss).toLocaleString('ko-KR')}만 원</b></mark>이 빠져요</p>`;
  }
  return `<h1 class="t2 res">${lead}<mark class="num kn">${countNum(mp.kept)}만 원</mark>이<br>남아요</h1>`;
}

function reportText(t) {
  if (t.includes('구직촉진수당')) return t.includes('취업') ? '취업한 사실을 고용센터에 신고해요' : '수당을 신청할 때마다 번 돈을 신고해요';
  return '다음 해 5월에 종합소득세를 신고해요';
}

function periodLabel(p) { return p.from === p.to ? `${p.from}월` : `${p.from}~${p.to}월`; }
function periodsCard(r) {
  const ps = r.summary.periods;
  if (ps.length < 2) return '';
  // 수당을 받는 사람만 수당 상태를 보이고, 아니면 날짜로 넣은 기간의 일한 날 수를 보인다.
  const hasAllowance = r.cards.some((c) => c.id === 'jobSeekerAllowance');
  const small = (p) => (hasAllowance
    ? (p.allowancePaid === null ? '수당 끝남' : p.allowancePaid > 0 ? `수당 ${man(p.allowancePaid)} 받음` : '수당 0원')
    : r.pay.byMonth && p.from === p.to && r.pay.byMonth[p.from] ? `일한 날 ${r.pay.byMonth[p.from].workDays}일` : '');
  return `<p class="sec">달마다 남는 돈</p><div class="rows kvs">${ps.map((p) => `<div class="kv col2"><span class="k"><b>${periodLabel(p)}</b><small>${small(p)}</small></span><span class="v num">${r.summary.span ? '' : '한 달 '}${man(p.net)}</span></div>`).join('')}</div>`;
}
function nextPeriodLine(r) {
  const ps = r.summary.periods;
  // 수당이 끝나 구간이 나뉜 경우에만 쓴다. 날짜로 넣은 기간은 달마다 금액이 달라 아래 목록으로 보여 준다.
  if (ps.length < 2 || r.summary.span) return '';
  const later = ps[ps.length - 1];
  if (later.net === ps[0].net) return '';
  return `<p class="cut">${later.from}월부터는 수당이 끝나서 한 달에 <mark><b class="num">${man(later.net)}</b></mark>이 남아요</p>`;
}

function viewResult() {
  const r = state.result;
  const s = r.summary;
  const offer = state.offers[state.active];
  const job = jobOf(offer.fields);
  const lines = r.cards.map((c) => [c, cardLine(c)]).filter(([, l]) => l);
  const holds = lines.filter(([c, l]) => c.crossed === null || l[5]);
  const shown = lines.filter(([c, l]) => c.crossed !== null && !l[5]);
  const unknownPay = job.incomeType === 'unknown';
  const better = unknownPay ? null : betterOptionAll();
  const rowOf = ([c, l]) => row({ ic: l[0], cls: l[1], title: esc(l[2]), sub: l[3], badge: l[4], action: 'cardSheet', attrs: `data-id="${c.id}"` });
  const reports = s.reports.map((t) => row({ ic: 'doc', cls: 'blue', title: esc(reportText(t)), sub: t.includes('구직촉진수당') ? '고용센터 · 고용노동부 1350' : '홈택스 · 국세청 126', badge: '<span class="tagm blue">신고</span>' }));
  const pendingLine = holds.length
    ? `<p class="cut">${unknownPay ? `급여를 어떻게 받는지 몰라 ${holds.length}가지는 아직 계산하지 못했어요` : `${holds.length}가지는 확인이 필요해요`}${tag(STATUS.CHECK)}</p>` : '';
  const multi = state.offers.length > 1;
  return {
    // 제안이 하나뿐이면 "제안 1" 같은 이름을 본 적이 없으니 조건으로 부른다.
    // PC에서는 왼쪽에 결론 문장과 영수증, 오른쪽에 나머지 카드. 휴대폰은 두 칸이 위아래로 이어져 순서가 그대로다.
    html: `<div class="split"><div class="col-a">
      <p class="pre">${state.offers.length > 1 ? `${esc(josa(offer.name, '을', '를'))} 시작하면` : '이 조건으로 일을 시작하면'}</p>
      ${resultTitle(r, job)}
      ${nextPeriodLine(r)}
      ${pendingLine}
      <div class="card rcpt">${moneyBar(s, { height: 16, legend: false, keptName: unknownPay ? '받는 돈 (떼기 전)' : '남는 돈' })}${receiptRows(s, { keptName: unknownPay ? '받는 돈 (떼기 전)' : '남는 돈' })}<div class="rc-foot">${STAMP}</div></div>
      </div><div class="col-b">
      ${betterCards(better, better && better.hours ? keepAllowanceOption() : null)}
      ${!unknownPay && state.alts ? hoursSlider(state.alts, state.chosenHours ?? (state.alts.offeredOutOfRange ? state.alts.trace.to : state.alts.offered)) : ''}
      ${shown.length || reports.length ? `<p class="sec">달라지는 것</p><div class="rows">${shown.map(rowOf).join('')}${reports.join('')}</div>` : holds.length ? '' : '<p class="gline">지금 조건에서는 지원이나 자격에 달라지는 것이 없어요</p>'}
      ${holds.length ? `<p class="sec">${unknownPay ? '아직 계산하지 못한 것' : '확인이 필요한 것'}</p><div class="rows">${holds.map(rowOf).join('')}</div>
        ${unknownPay ? `<p class="gline">급여를 어떻게 받는지 ${offer.rawText ? '공고에 없어서' : '몰라서'}예요. 4대보험을 떼는지, 3.3%를 떼는지 사장님께 물어보면 계산할 수 있어요</p>` : ''}` : ''}
      ${r.outOfScope.length ? `<p class="sec">계산하지 않는 지원</p><div class="rows">${r.outOfScope.map((o) => row({ title: esc(o.title), sub: esc(o.note ? `${polite(o.note)} · ${o.contact}` : o.contact) })).join('')}</div>` : ''}
      ${r.warnings.map((w) => `<p class="gline warn" role="alert">${esc(polite(w))}</p>`).join('')}
      ${periodsCard(r)}
      <div class="card mini"><div class="hd"><b>1년 동안 버는 돈 (떼기 전)</b><span class="num">12월까지 ${man(r.timeline.rows[11].cumulative.total)}</span></div>${yearBars(r)}</div>
      ${linkBtn('금액 자세히 보기', 'amountSheet')}
      ${r.notApplicable.length ? `<details class="raw-box"><summary>해당 없어 계산하지 않은 것 ${r.notApplicable.length}가지</summary><ul>${r.notApplicable.map((n) => `<li><b>${esc(n.title)}</b> ${esc(polite(n.reason))}</li>`).join('')}</ul></details>` : ''}
      ${r.notices.map((n) => `<p class="gline">${esc(polite(n))}</p>`).join('')}
      ${job.incomeType !== 'business' ? '<p class="gline">밤 10시~아침 6시, 하루 8시간을 넘는 시간, 휴일에 일해서 더 받는 수당(5명 이상 사업장)은 계산하지 않았어요</p>' : ''}
      ${multi ? linkBtn(`다른 제안과 비교하기`, 'go', 'data-step="compare"') : ''}
      ${DISCLAIMER}
      </div></div>`,
    bottom: !state.alts ? cta(unknownPay ? '물어볼 말 보기' : '시작 전 준비', 'go', 'data-step="basis"')
      : unknownPay ? two(weak('근무시간 바꿔 보기', 'go', 'data-step="alts"').replace('cta weak', 'cta weak eq'), cta('물어볼 말 보기', 'go', 'data-step="basis"'))
      : two(weak('시작 전 준비', 'go', 'data-step="basis"'), cta('근무시간 바꿔 보기', 'go', 'data-step="alts"')),
  };
}

function yearBars(r) {
  const rows = r.timeline.rows;
  const max = Math.max(1, rows[11].cumulative.total);
  return `<div class="bars" role="img" aria-label="1월부터 12월까지 누적 소득. 12월까지 ${won(rows[11].cumulative.total)}">${rows.map((row) => `<i class="${row.working ? '' : 'off'}" style="height:${Math.max(3, Math.round((row.cumulative.total / max) * 100))}%"></i>`).join('')}</div>
    <div class="bars-x" aria-hidden="true">${rows.map((row) => `<span>${row.month}</span>`).join('')}</div>`;
}

// ---------------- 제안 비교 ----------------

// 수당이 끝나 금액이 바뀌는 제안은 카드 금액이 언제까지의 금액인지 밝힌다 (결과 화면의 "N월까지 기준"과 같게).
function laterNote(res) {
  const ps = res.summary.periods;
  if (!ps || ps.length < 2 || res.summary.span) return '';
  const later = ps[ps.length - 1];
  if (later.net === ps[0].net) return '';
  return `<span class="gl2">${ps[0].to}월까지 기준 · ${later.from}월부터 한 달 ${man(later.net)}</span>`;
}

function viewCompare() {
  const c = state.comparison;
  const rows = c.rows;
  const scale = Math.max(...rows.map((r) => r.gross));
  const h = c.highlights;
  const anyDays = rows.some((r) => r.days || r.span);
  const allDays = rows.every((r) => r.days || r.span);
  // 달로 넣은 제안(한 달 금액)과 일수·날짜로 넣은 제안(그 기간 합계)이 섞이면 남는 금액은 단위가 달라 견주지 않는다.
  // '남는 금액이 가장 커요'를 붙이지 않고 시간당 금액만 견주며, 카드마다 금액이 한 달인지 기간 합계인지 적고 막대도 카드마다 따로 그린다.
  const mixed = anyDays && !allDays;
  const netLead = mixed ? -1 : h.net;
  const title = rows.length > 1 && netLead !== -1 && h.netPerHour !== -1 && netLead !== h.netPerHour
    ? (anyDays ? '더 남는 제안과<br><mark>시간당</mark> 더 남는 제안이 달라요' : '<mark>한 달</mark>에 더 남는 제안과<br><mark>시간당</mark> 더 남는 제안이 달라요')
    : mixed && rows.length > 1 ? `제안 ${rows.length}개를<br><mark>시간당</mark> 남는 돈으로 견줘요`
      : `제안 ${rows.length}개를<br><mark>같은 기준</mark>으로 계산했어요`;
  const lead = (i) => (rows.length > 1 && netLead === i ? `<span class="tagm ok">${anyDays ? '남는 금액' : '한 달 금액'}이 가장 커요</span>` : '') + (rows.length > 1 && h.netPerHour === i ? '<span class="tagm ok">시간당 금액이 가장 커요</span>' : '');
  const unitOf = (r) => (!mixed ? '' : r.days || r.span ? ' · 기간 합계' : ' · 한 달 금액');
  return {
    html: `<h1 class="t2">${title}</h1>
      <div class="cmp-grid">${rows.map((r, i) => `<button type="button" class="cmp" data-action="detail" data-i="${i}">
        <span class="top"><span class="nm"><b>${esc(r.name)}</b>일주일에 ${r.job.weeklyHours}시간 · ${r.span ? (r.span.countedLabel || r.span.label) : r.days ? `${r.days}일` : `${r.workedMonths}개월`}${unitOf(r)}</span><span class="amt2 num">${man(r.net)}</span></span>
        ${moneyBar(r.result.summary, { scale: mixed ? null : scale, height: 12, legend: false })}
        <span class="meta"><span class="num">시간당 남는 돈 ${won(r.netPerHour)}</span>${lead(i)}${r.allowanceLoss ? '<span class="tagm need">정부 지원 줄어듦</span>' : ''}${r.result.summary.pendingIds.length ? `<span class="tagm need">확인 필요 ${r.result.summary.pendingIds.length}</span>` : ''}${r.withinHours ? '' : '<span class="tagm hold">할 수 있는 시간 초과</span>'}</span>
        ${laterNote(r.result)}
      </button>`).join('')}</div>
      <div class="lg"><span>남는 돈</span><span class="o">보험료·세금</span><span class="r">줄어드는 정부 지원</span></div>
      <p class="gline">${mixed ? '달로 넣은 제안은 한 달에, 일수나 날짜로 넣은 제안은 그 기간 동안 남는 돈이에요' : allDays ? '금액은 넣은 기간 동안 남는 돈이에요' : '금액은 한 달에 남는 돈이에요'}. 번 돈에서 보험료와 줄어드는 정부 지원을 뺀 돈이에요${mixed ? '. 단위가 달라 남는 금액은 견주지 않고 시간당 남는 돈만 견줬어요' : ''}. 고르는 건 내 몫이에요. 카드를 누르면 자세히 볼 수 있어요</p>`,
    bottom: two(weak('제안 더하기', 'addOffer', state.offers.length < MAX_OFFERS ? '' : 'disabled'), cta('내 상황 바꾸기', 'go', 'data-step="profile"')),
  };
}

// ---------------- 근무조건 비교 ----------------

function altsTitle(a) {
  const loss = a.changePoints.find((c) => c.changes.some((x) => x.type === 'loss'));
  if (loss) {
    const x = loss.changes.find((y) => y.type === 'loss');
    const what = x.text.includes('끝남') ? '정부 지원이 끊겨요' : x.text.includes('지급되지') ? '정부 지원을 받지 못해요' : '정부 지원이 줄기 시작해요';
    return `<mark class="num">주 ${loss.weeklyHours}시간</mark>부터<br>${what}`;
  }
  const check = a.changePoints.find((c) => c.changes.some((x) => x.type === 'check'));
  if (check) return `<mark class="num">주 ${check.weeklyHours}시간</mark>부터<br>연간 기준을 넘는 지원이 있어요`;
  const gain = a.changePoints.find((c) => c.changes.some((x) => x.type === 'gain'));
  if (gain) return `<mark class="num">주 ${gain.weeklyHours}시간</mark>부터<br>주휴수당과 4대보험이 생겨요`;
  // 판단을 보류한 지점이 있으면 "달라지는 게 없다"고 하지 않는다.
  const pending = a.changePoints.find((c) => c.changes.some((x) => x.type === 'pending'));
  if (pending) return `<mark class="num">주 ${pending.weeklyHours}시간</mark>부터<br>확인할 것이 생겨요`;
  return '할 수 있는 시간 안에서는<br><mark>달라지는 게 없어요</mark>';
}

function altOptions(a) {
  const at = (h) => a.table.find((t) => t.weeklyHours === h);
  const list = [];
  // 한 시간에 이름이 여러 개 붙으면 함께 보인다 (예: 받은 제안 그대로 · 가장 많이 남는 시간).
  const add = (h, name) => {
    const t = at(h);
    if (!t) return;
    const found = list.find((x) => x.weeklyHours === h);
    if (found) { if (!found.names.includes(name)) found.names.push(name); } else list.push({ ...t, names: [name] });
  };
  if (!a.offeredOutOfRange) add(a.offered, '받은 제안 그대로');
  // "가장 많이 남는 시간"은 할 수 있는 시간 전체에서 고른다.
  if (a.best) add(a.best.weeklyHours, '가장 많이 남는 시간');
  // 줄어드는 구간 직전의 봉우리는 범위를 밝혀서 보인다. 전체에서 가장 많이 남는 시간과 같으면 따로 붙이지 않는다.
  if (a.dip && (!a.best || a.dip.peakHours !== a.best.weeklyHours)) add(a.dip.peakHours, `주 ${a.dip.to}시간까지 중에서는 가장 많이 남는 시간`);
  const keep = a.table.filter((t) => t.allowanceLoss === 0 && t.allowancePaid !== null).pop();
  if (keep && a.table.some((t) => t.allowanceLoss > 0)) add(keep.weeklyHours, '정부 지원이 그대로인 가장 긴 시간');
  add(a.trace.to, '내가 할 수 있는 최대 시간');
  return list.map((x) => ({ ...x, name: x.names.join(' · ') })).sort((x, y) => x.weeklyHours - y.weeklyHours);
}

// 근무시간 표의 한 줄을 돈 막대 계산 모양으로. 보험료 칸에는 떼는 돈(gross − takeHome)을 넣는다.
const altSum = (o) => ({ addedIncome: o.gross, insurance: o.gross - o.takeHome, withholding: 0, allowanceLoss: o.allowanceLoss });

// 근무시간 막대: 끌거나 화살표 키로 주 1시간씩 바꾸며 그 시간에 남는 돈을 본다(결과 화면, 근무시간 비교 화면).
// 이득 없는 구간(더 일해도 직전 봉우리보다 덜 남는 시간, a.dip)은 막대 아래에 빨간 줄로 표시한다.
// 끄는 동안은 글자와 막대 색만 바꾸고, 손을 떼면(change) 고른 시간으로 화면을 다시 그린다(onHoursSlider).
// 이득 없는 구간의 시간 범위. 한 시간뿐이면 '주 30~30시간'이 아니라 '주 30시간'으로 쓴다.
const dipSpan = (d) => (d.from === d.to ? `${d.from}` : `${d.from}~${d.to}`);
function sliderRead(a, h) {
  const t = a.table.find((x) => x.weeklyHours === h);
  if (!t) return '';
  const cur = a.offeredOutOfRange ? null : a.table.find((x) => x.weeklyHours === a.offered);
  const d = cur ? t.net - cur.net : 0;
  const vs = !cur ? '' : h === a.offered ? '받은 제안 그대로' : d > 0 ? `받은 제안보다 ${manOrWon(d)} 더` : d < 0 ? `받은 제안보다 ${manOrWon(-d)} 덜` : '받은 제안과 같아요';
  const inDip = a.dip && h >= a.dip.from && h <= a.dip.to;
  return `남는 돈 <b class="num">${won(t.net)}</b>${vs ? `<span>${vs}</span>` : ''}${t.allowanceEnded ? '<span class="r">구직촉진수당이 끊겨요</span>' : ''}${inDip ? `<span class="r">주 ${a.dip.peakHours}시간보다 ${manOrWon(a.dip.peakNet - t.net)} 덜 남아요</span>` : ''}`;
}
function sliderText(a, h) {
  const t = a.table.find((x) => x.weeklyHours === h);
  const inDip = a.dip && h >= a.dip.from && h <= a.dip.to;
  return `주 ${h}시간${t ? `, 남는 돈 ${won(t.net)}` : ''}${inDip && t ? `, 이득 없는 구간, 주 ${a.dip.peakHours}시간보다 ${manOrWon(a.dip.peakNet - t.net)} 덜 남아요` : ''}`;
}
function hoursSlider(a, chosen) {
  const first = a.table[0].weeklyHours;
  const last = a.trace.to;
  const f = (h) => ((h - first) / Math.max(1, last - first)).toFixed(4);
  // 구간은 시간 칸의 경계까지(앞뒤 0.5시간) 칠한다. 막대 끝을 넘지 않게 0~1로 자른다.
  const c01 = (x) => Math.min(1, Math.max(0, Number(x))).toFixed(4);
  const zone = a.dip ? `--d0:${c01(f(a.dip.from - 0.5))};--d1:${c01(f(a.dip.to + 0.5))};` : '';
  const inDip = a.dip && chosen >= a.dip.from && chosen <= a.dip.to;
  return `<div class="hs">
    <label class="hs-l" for="hs-in">주당 근무시간</label>
    <div class="hs-tr${a.dip ? ' zone' : ''}${inDip ? ' in-dip' : ''}" style="--f:${f(chosen)};${zone}">
      <input id="hs-in" class="hs-in" type="range" min="${first}" max="${last}" step="1" value="${chosen}" aria-valuetext="${sliderText(a, chosen)}" aria-describedby="hs-v hs-read">
      ${a.dip ? `<span class="hs-zone" aria-hidden="true"></span><span class="hs-zl">이득 없는 구간 주 ${dipSpan(a.dip)}시간</span>` : ''}
    </div>
    <output class="hs-v num" id="hs-v" for="hs-in">주 ${chosen}시간</output>
    <p class="hs-read" id="hs-read">${sliderRead(a, chosen)}</p>
  </div>`;
}
function onHoursSlider(t, commit) {
  if (t.id !== 'hs-in' || !state.alts) return false;
  const a = state.alts;
  const h = Number(t.value);
  const first = Number(t.min);
  const last = Number(t.max);
  const tr = t.closest('.hs-tr');
  tr.style.setProperty('--f', ((h - first) / Math.max(1, last - first)).toFixed(4));
  tr.classList.toggle('in-dip', Boolean(a.dip && h >= a.dip.from && h <= a.dip.to));
  t.setAttribute('aria-valuetext', sliderText(a, h));
  document.getElementById('hs-v').textContent = `주 ${h}시간`;
  document.getElementById('hs-read').innerHTML = sliderRead(a, h);
  // PC 그래프의 고른 막대도 함께 옮긴다. 아래 숫자 줄은 손을 뗀 뒤 다시 그릴 때 맞춘다.
  document.querySelectorAll('.hc-col').forEach((c, i) => c.classList.toggle('on', a.table[i] && a.table[i].weeklyHours === h));
  state.chosenHours = h;
  state.requestAction = null;
  if (commit) {
    render(true);
    document.getElementById('hs-in')?.focus({ preventScroll: true });
  }
  return true;
}

// PC 전용 그래프: 주 1시간부터 할 수 있는 최대 시간까지 한 시간마다 막대 하나. 아래부터 남는 돈·보험료·줄어드는 정부 지원을 쌓는다.
// 고른 시간은 보라 테두리, 받은 제안 시간은 아래 글자, 달라지는 지점은 점선 눈금. 누르는 곳이 없는 보기용 그림이다.
function hoursChart(a, chosen) {
  const parts = a.table.map((t) => moneyParts(altSum(t)));
  const scale = Math.max(1, ...parts.map((p) => p.kept + p.deduct + p.loss));
  const marks = new Set(a.changePoints.map((c) => c.weeklyHours));
  const offered = a.offeredOutOfRange ? null : a.offered;
  const first = a.table[0].weeklyHours;
  const label = `근무시간별 남는 돈. 주 ${first}시간부터 ${a.trace.to}시간까지 한 시간씩 계산했어요. 가장 많이 남는 시간은 주 ${a.best.weeklyHours}시간 ${man(a.best.net)}이에요.`
    + (a.dip ? ` 주 ${dipSpan(a.dip)}시간은 주 ${a.dip.peakHours}시간보다 적게 남아요.` : '')
    + (offered ? ` 받은 제안은 주 ${offered}시간이에요.` : '');
  const cols = a.table.map((t, i) => {
    const p = parts[i];
    const seg = (cls, v) => (v > 0 ? `<i class="${cls}" style="flex-grow:${v}"></i>` : '');
    return `<span class="hc-col${t.weeklyHours === chosen ? ' on' : ''}${marks.has(t.weeklyHours) ? ' mk' : ''}"><span class="hc-stack" style="height:${(((p.kept + p.deduct + p.loss) / scale) * 100).toFixed(2)}%">${seg('r', p.loss)}${seg('o', p.deduct)}${seg('g', p.kept)}</span></span>`;
  }).join('');
  // 줄어드는 구간: 직전 봉우리의 남는 돈 높이에 점선을 그어, 그 뒤 막대의 남는 돈이 그보다 낮은 게 보이게 한다.
  const n = a.table.length;
  const at = (h) => a.table.findIndex((t) => t.weeklyHours === h);
  const i0 = a.dip ? at(a.dip.peakHours) : -1;
  const i1 = a.dip ? at(a.dip.to) : -1;
  const ref = i0 >= 0 && i1 > i0
    ? `<i class="hc-ref" style="left:calc(${i0} * (100% + 4px) / ${n});width:calc(${i1 - i0 + 1} * (100% + 4px) / ${n} - 4px);bottom:calc(${((parts[i0].kept / scale) * 100).toFixed(2)} * (100% - 8px) / 100)"></i>` : '';
  // 이득 없는 구간: 막대 뒤에 옅은 빨간 띠를 깔고 위에 이름을 적는다.
  const j0 = a.dip ? at(a.dip.from) : -1;
  const dipBand = j0 >= 0 && i1 >= j0
    ? `<i class="hc-dip" style="left:calc(${j0} * (100% + 4px) / ${n} - 2px);width:calc(${i1 - j0 + 1} * (100% + 4px) / ${n})"><b>이득 없는 구간</b></i>` : '';
  const axis = a.table.map((t) => {
    const h = t.weeklyHours;
    const show = h === first || h === a.trace.to || marks.has(h) || h === offered || h === chosen;
    return `<span class="hc-x${h === chosen ? ' on' : marks.has(h) ? ' mk' : ''}">${show ? h : ''}${h === offered ? '<small>받은 제안</small>' : ''}</span>`;
  }).join('');
  return `<div class="hc hd pc-only" role="img" aria-label="${esc(label)}">
    <p class="sec" aria-hidden="true">근무시간별 남는 돈</p>
    <div class="hc-plot" aria-hidden="true">${dipBand}${cols}${ref}</div>
    <div class="hc-axis" aria-hidden="true">${axis}</div>
  </div>`;
}

function viewAlts() {
  const a = state.alts;
  const opts = altOptions(a);
  // 만 원 단위로 같아 보이는 카드가 있으면 원 단위로 보여 준다 (예: 840,260원과 842,783원).
  const mans = opts.map((o) => man(o.net));
  const exact = new Set(mans).size < mans.length;
  const chosen = state.chosenHours ?? (a.offeredOutOfRange ? a.trace.to : a.offered);
  const scale = Math.max(...opts.map((o) => o.gross));
  const sumOf = altSum;
  const typeIcon = { gain: ['plus', 'green'], loss: ['down', 'red'], check: ['down', 'red'], pending: ['hold', 'gray'], note: ['plus', 'green'] };
  // PC에서는 시간 카드를 틀 폭에 나란히(.hd), 그 아래 왼쪽에 달라지는 지점, 오른쪽(.cb)에 설명 줄을 둔다.
  // 달라지는 지점이 없으면 설명 줄을 왼쪽 칸에 그대로 둔다.
  const notes = `${a.dip ? `<p class="gline">주 ${dipSpan(a.dip)}시간은 주 ${a.dip.peakHours}시간(${perShort(state.result && state.result.summary)} ${man(a.dip.peakNet)})보다 남는 돈이 적어요. 줄어드는 정부 지원이 늘어나는 급여보다 커서예요</p>` : ''}
      ${allowanceUntil() ? `<p class="gline">수당이 끝나는 ${allowanceUntil()}월까지 기준이에요. ${allowanceUntil() + 1}월부터는 줄어드는 수당이 없어서 일한 만큼 더 남아요</p>` : ''}
      <p class="gline">시급과 기간은 그대로 두고 근무시간만 1시간씩 바꿔 ${a.trace.evaluated}번 계산했어요. 고르는 건 내 몫이에요</p>`;
  return {
    layout: 'c2',
    html: `<h1 class="t2 hd">${altsTitle(a)}</h1>
      ${a.offeredOutOfRange ? `<p class="gline warn hd">받은 제안(주 ${a.offered}시간)은 할 수 있는 시간을 넘어 비교에서 뺐어요</p>` : ''}
      <p class="gline hd" id="alts-help">아래 시간을 눌러 고르면, 그 시간으로 사장님께 보낼 문구를 만들 수 있어요</p>
      <div class="opc-grid hd" role="radiogroup" aria-label="비교할 근무시간" aria-describedby="alts-help">${opts.map((o) => `<button type="button" role="radio" aria-checked="${o.weeklyHours === chosen}" class="opc ${o.weeklyHours === chosen ? 'on' : ''}" data-action="chooseHours" data-hours="${o.weeklyHours}">
        <span class="top"><span class="nm num">주 ${o.weeklyHours}시간</span><span class="am">남는 돈 <b class="num">${exact ? won(o.net) : man(o.net)}</b></span></span>
        <span class="gl2">${esc(o.name)}</span>
        ${moneyBar(sumOf(o), { scale, height: 12, legend: false })}
      </button>`).join('')}</div>
      <div class="lg hd"><span>남는 돈</span><span class="o">보험료</span><span class="r">줄어드는 정부 지원</span></div>
      <div class="hd">${hoursSlider(a, chosen)}</div>
      ${hoursChart(a, chosen)}
      ${a.changePoints.length ? `<p class="sec">달라지는 지점</p><div class="rows">${a.changePoints.map((c) => {
        const x = c.changes[0];
        const [ic, cls] = typeIcon[x.type] || ['hold', 'gray'];
        return row({ ic, cls, title: `주 ${c.weeklyHours}시간부터`, sub: esc(c.changes.map((y) => polite(y.text)).join(' · ')) });
      }).join('')}</div>
      <div class="cb">${notes}</div>` : notes}`,
    bottom: two(weak('시작 전 준비', 'go', 'data-step="basis"'), cta('이 시간으로 문구 만들기', 'go', 'data-step="message"')),
  };
}

function requestState() {
  const a = state.alts;
  const offered = a.offered;
  const target = state.chosenHours ?? (a.offeredOutOfRange ? a.trace.to : offered);
  const available = Object.keys(REQUEST_ACTIONS).filter((k) => {
    if (k === 'expand') return target > offered;
    if (k === 'adjust') return target < offered;
    if (k === 'accept') return target === offered && !a.offeredOutOfRange;
    return true;
  });
  const fallback = target > offered ? 'expand' : target < offered ? 'adjust' : a.offeredOutOfRange ? 'terms' : 'accept';
  const action = available.includes(state.requestAction) ? state.requestAction : fallback;
  return { offered, target, available, action };
}
const ACTION_LABEL = { expand: '시간 늘리기 요청', adjust: '시간 조정 요청', terms: '급여 조건 확인', accept: '그대로 수락' };

function messageText() {
  const rq = requestState();
  const questions = state.comparison.rows[state.active].questions;
  return buildRequestMessage(rq.action, { offeredHours: rq.offered, targetHours: rq.target, questions: rq.action === 'expand' || rq.action === 'adjust' ? questions.filter((q) => !q.includes('근무시간')) : questions });
}

// PC에서는 왼쪽에 문구 상자, 오른쪽에 요청 종류와 '다른 시간으로 바꾸기'(css에서 자리를 정한다)
function viewMessage() {
  const rq = requestState();
  return {
    layout: 'c2',
    html: `<h1 class="t2 hd">사장님께 보낼<br><mark>문구</mark>를 만들었어요</h1>
      <p class="gline num hd">주 ${rq.target}시간 기준</p>
      <div class="chips sel" role="radiogroup" aria-label="요청 종류">${rq.available.map((k) => `<button type="button" role="radio" aria-checked="${k === rq.action}" class="${k === rq.action ? 'on' : ''}" data-action="reqAction" data-value="${k}">${esc(ACTION_LABEL[k])}</button>`).join('')}</div>
      <pre class="msg" id="msg">${esc(messageText())}</pre>
      <p class="gline">근무시간과 일정만 담았어요. 고쳐서 보내도 돼요</p>
      ${linkBtn('다른 시간으로 바꾸기', 'go', 'data-step="alts"')}`,
    bottom: two(weak('시작 전 준비', 'go', 'data-step="basis"'), cta('문구 복사하기', 'copy')),
  };
}

// ---------------- 시작 전 준비 ----------------

function viewBasis() {
  const r = state.result;
  const rules = state.rules;
  const questions = state.comparison.rows[state.active].questions;
  const reports = r.summary.reports.map(reportText);
  const checks = [...r.checks.map((c) => polite(c.text)), ...r.outOfScope.filter((o) => o.note).map((o) => `${o.title}: ${polite(o.note)}`)];
  let n = 0;
  const box = (t, extra = '') => `<label class="chk"><input type="checkbox" data-check="${n++}"><span>${esc(t)}${extra}</span></label>`;
  const groups = [
    ['사장님께 물어볼 것', questions.map((q) => box(q))],
    ['신고할 것', reports.map((q) => box(q, ' <span class="tagm blue">신고</span>'))],
    ['확인할 것', checks.map((q) => box(q))],
  ].filter(([, items]) => items.length);
  const total = n;
  const allowanceNote = r.cards.some((c) => c.id === 'jobSeekerAllowance')
    ? '<p class="gline">수당 지급 정지가 3번이 되면 수급자격이 철회돼요. 신고하지 않고 받으면 받은 돈을 돌려주고 같은 금액을 더 내야 해요</p>' : '';
  const contacts = Object.values(rules.contacts).map((c) => `<a class="kv" href="tel:${esc(c.phone)}"><span class="k">${esc(c.name)}</span><span class="v num">${esc(c.phone)}${icon('phone')}</span></a>`).join('');
  const others = r.outOfScope.map((o) => `<div class="kv"><span class="k">${esc(o.title)}</span><span class="v small">${esc(o.contact)}</span></div>`).join('');
  const sources = r.cards.map((c) => {
    const rule = rules[c.id];
    const list = c.sources.map((id) => rules.sources[id]).filter(Boolean);
    return `<li><b>${esc(c.title)}</b> ${tag(c.status)}<br>${list.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join('<br>')}<br><span class="small">확인일 ${esc(rule.checkedAt || (rule.current && rule.current.checkedAt) || rules.version)}</span></li>`;
  }).join('');
  // PC에서는 왼쪽에 챙길 것 목록, 오른쪽(.cb)에 물어볼 곳과 계산 근거
  return {
    layout: 'c2',
    html: `<h1 class="t2 hd">시작하기 전에<br>${total ? `<mark>${total}가지</mark>만 챙겨요` : '<mark>챙길 것이 없어요</mark>'}</h1>
      ${groups.map(([t, items]) => `<p class="sec">${t}</p><div class="rows checks">${items.join('')}</div>`).join('')}
      ${allowanceNote}
      <div class="cb">
      <p class="sec">물어볼 곳</p><div class="rows kvs">${contacts}${others}</div>
      <details class="raw-box"><summary>계산 근거와 출처</summary>
        <p class="small">규칙표 ${esc(rules.version)} 기준. 확실은 법령·고시 원문을 확인한 규칙, 어림값은 2차 자료로 계산한 값, 확인 필요는 원문을 확인하지 못한 규칙이에요.</p>
        <ul class="src">${sources}</ul></details>
      <p class="gline">신고를 피하는 방법은 알려 드리지 않아요</p>
      <p class="gline center"><button type="button" class="inline" data-action="restart">내 입력 모두 지우기</button></p>
      </div>`,
    // 왼쪽 버튼은 결과로 돌아간다. 전에는 '처음으로'가 확인 없이 입력을 모두 지웠다(지우기는 가운데 '내 입력 모두 지우기'로만).
    bottom: two(weak('결과 보기', 'back'), cta(AI_OFF ? '다른 조건 넣기' : '다른 공고 올리기', 'newOffer')),
  };
}

// ---------------- 개인정보 처리 안내 ----------------

function viewPrivacy() {
  const kv = (k, v) => `<div class="kv col"><span class="k">${k}</span><span class="v small">${v}</span></div>`;
  const agreed = consentChoice() === 'yes';
  // PC에서는 왼쪽에 무엇을 어디로 보내는지, 오른쪽(.cb)에 지킬 것·보관과 지우기·만든 사람
  return {
    top: 'back',
    layout: 'c2',
    html: `<h1 class="t2 hd">개인정보 처리 안내</h1>
      <p class="sec">무엇을 어디로 보내나요</p>
      <div class="rows kvs">
        ${AI_OFF ? kv('공고 사진과 글', '이 체험 주소에서는 AI 공고 읽기를 쓰지 않아 보내지 않아요') : kv('공고 사진과 글', '한끗 서버를 거쳐 Anthropic(미국)의 AI가 읽어요. 한끗 서버는 저장하지 않아요')}
        ${kv('내 상황 (나이, 근무 시간, 번 돈, 받는 지원)', '이 브라우저 안에서만 계산에 써요. 서버로 보내지 않아요')}
        ${CLARITY_ID
          ? kv('사용 기록 (Microsoft Clarity)', '동의한 경우에만 어느 화면에서 무엇을 눌렀는지, 스크롤과 화면 이동을 Microsoft(미국)로 보내요. 입력한 값과 계산 금액은 가려서 보내지 않아요. 이를 위해 쿠키를 써요') + kv('로그인', '쓰지 않아요')
          : kv('로그인 · 쿠키 · 분석 도구', '쓰지 않아요')}
        ${kv('글꼴', 'Pretendard 글꼴을 공개 서비스 jsDelivr에서 불러와요')}
      </div>
      <div class="cb">
      ${CLARITY_ID ? `<p class="sec">사용 기록 동의</p>
      <p class="gline">지금은 <b>${agreed ? '동의함' : '동의하지 않음'}</b>이에요. 동의하지 않아도 모든 기능을 똑같이 쓸 수 있어요 <button type="button" class="inline" data-action="${agreed ? 'consentWithdraw' : 'consentAsk'}">${agreed ? '동의 거두기' : '다시 고르기'}</button></p>
      <p class="gline">Microsoft가 사용 기록을 처리하는 방식은 <a href="${LINKS.microsoftPrivacy}" target="_blank" rel="noopener">Microsoft 개인정보처리방침</a>을 따라요</p>` : ''}
      ${AI_OFF ? '' : `<p class="sec">꼭 지켜 주세요</p>
      <p class="gline">공고에 있는 이름, 전화번호, 주소는 지우거나 가리고 올려 주세요. AI로 보내는 내용에는 개인정보가 없어야 해요</p>`}
      <p class="sec">보관과 지우기</p>
      <p class="gline">입력한 내용은 이 탭에만 임시로 남고, 탭을 닫으면 사라져요. 지금 바로 지우려면 아래 버튼을 눌러 주세요</p>
      ${AI_OFF ? '' : `<p class="gline">AI 회사가 받은 내용을 처리하는 방식은 <a href="${LINKS.anthropicPrivacy}" target="_blank" rel="noopener">Anthropic 개인정보 처리방침</a>을 따라요</p>`}
      <p class="sec">만든 사람 · 문의</p>
      <p class="gline">한끗 팀 · 2026 대한민국 청년 CAREER FAIR AI 해커톤 출품작<br><a href="${LINKS.repo}" target="_blank" rel="noopener">GitHub 저장소</a>의 Issues로 문의해 주세요</p>
      ${DISCLAIMER}
      </div>`,
    bottom: two(weak('내 입력 모두 지우기', 'restart').replace('cta weak', 'cta weak eq'), cta('돌아가기', 'back')),
  };
}

// ---------------- 아래에서 올라오는 창 ----------------

function sheetEdit(key) {
  const f = state.fields[key];
  let body = '';
  if (key === 'weeklyHours') body = stepper('e-val', state.sheet.draft ?? f.value, '시간', 1, 52) + `<div class="chips center">${[15, 20, 24, 30].map((h) => `<button type="button" data-action="setNum" data-target="e-val" data-value="${h}">${h}시간</button>`).join('')}</div>`;
  else if (key === 'hourlyWage') body = `<div class="form"><label for="e-val">시급</label><div class="unit"><input id="e-val" type="number" inputmode="numeric" min="1" max="999999" value="${state.sheet.draft ?? f.value ?? ''}"><span>원</span></div></div>`;
  else if (key === 'months') {
    // 개월은 바로 고르고, 일수나 날짜는 아래에서 골라 넣는다.
    const sub = state.sheet.unit || (f.unit === 'date' ? 'date' : 'day');
    const year = state.rules.appliesToYear;
    const segB = (v, l) => `<button type="button" class="seg-b ${sub === v ? 'on' : ''}" data-action="sheetUnit" data-value="${v}" aria-pressed="${sub === v}">${l}</button>`;
    body = `<div class="grid3">${Array.from({ length: 12 }, (_, i) => `<button type="button" class="opt c ${!f.unit && !f.toYearEnd && f.value === i + 1 ? 'on' : ''}" data-action="sheetPick" data-value="${i + 1}">${i + 1}개월</button>`).join('')}</div>
      <p class="lbl">개월이 아니면</p>
      <div class="seg2 unit-seg" role="group" aria-label="기간을 넣는 방법">${segB('day', '일수로')}${segB('date', '날짜로')}</div>
      ${sub === 'date'
        ? `<div class="form grid2 pair"><div><label for="e-sdate">시작일</label><input id="e-sdate" class="field" type="date" min="${year}-01-01" max="${year}-12-31" value="${f.unit === 'date' ? f.start : ''}"></div>
          <div><label for="e-edate">끝나는 날</label><input id="e-edate" class="field" type="date" min="${f.unit === 'date' ? f.start : `${year}-01-01`}" max="${year + 1}-12-31" value="${f.unit === 'date' ? f.end : ''}"></div></div>`
        : `<div class="form"><label for="e-days">한 달보다 짧은 일 (최대 ${MAX_SHORT_DAYS}일)</label>
          <div class="unit"><input id="e-days" type="number" inputmode="numeric" min="1" max="${MAX_SHORT_DAYS}" value="${state.sheet.draft ?? (f.unit === 'day' ? f.value : '')}" placeholder="예: 5"><span>일</span></div></div>`}`;
  }
  else if (key === 'startMonth') body = `<div class="grid3">${Array.from({ length: 12 }, (_, i) => `<button type="button" class="opt c ${f.value === i + 1 ? 'on' : ''}" data-action="sheetPick" data-value="${i + 1}">${i + 1}월</button>`).join('')}</div>`;
  else if (key === 'incomeType') body = `<div class="opts">${Object.entries(PAY_LABEL).map(([v, l]) => `<button type="button" class="opt ${f.value === v ? 'on' : ''}" data-action="sheetPick" data-value="${v}">${esc(l)}<i aria-hidden="true"></i></button>`).join('')}</div>`;
  else body = `<div class="opts"><button type="button" class="opt ${f.value ? '' : 'on'}" data-action="sheetPick" data-value="false">시급과 따로 받아요<i aria-hidden="true"></i></button><button type="button" class="opt ${f.value ? 'on' : ''}" data-action="sheetPick" data-value="true">시급에 포함돼 있어요<i aria-hidden="true"></i></button></div>`;
  const numeric = ['weeklyHours', 'hourlyWage'].includes(key);
  const dateSheet = key === 'months' && (state.sheet.unit || (f.unit === 'date' ? 'date' : 'day')) === 'date';
  const save = numeric ? cta('이 값으로 바꾸기', 'saveEdit', `data-key="${key}"`) : key === 'months' ? (dateSheet ? cta('이 날짜로 바꾸기', 'saveDates') : cta('이 일수로 바꾸기', 'saveDays')) : '';
  return `<h2 id="sheet-title">${FIELD_NAME[key]}을 고쳐 주세요</h2>${body}
    ${state.sheet.hint ? `<p class="gline warn" role="alert">${esc(state.sheet.hint)}</p>` : ''}
    ${two(weak('닫기', 'closeSheet'), save)}`;
}

function sheetAmounts() {
  const s = state.result.summary;
  const rows = s.parts.map((x) => `<div class="amt"><span class="k">${esc(x.label === '4대보험 근로자 부담분' ? '보험료 (4대보험)' : x.label)}${tag(x.status)}</span><span class="n ${x.amount < 0 ? 'minus' : ''}">${x.amount < 0 ? '−' : '+'}${won(Math.abs(x.amount))}</span></div>`).join('');
  return `<h2 id="sheet-title">이렇게 계산했어요</h2>${rows}
    <div class="sum"><span>${perLong(s)} 남는 돈${s.periods.length > 1 && !s.span ? ` (${periodLabel(s.periods[0])})` : ''}</span><span class="n">${won(s.net)}</span></div>
    ${s.span && s.months.length > 1 ? s.months.map((m) => `<div class="amt"><span class="k">${m.month}월</span><span class="n">${won(m.net)}</span></div>`).join('')
      : s.periods.length > 1 ? s.periods.slice(1).map((p) => `<div class="amt"><span class="k">${periodLabel(p)} (수당 끝난 뒤)</span><span class="n">${won(p.net)}</span></div>`).join('') : ''}
    <p class="gline">남는 돈은 번 돈에서 보험료·세금과 줄어드는 정부 지원을 뺀 돈이에요</p>
    ${s.estimatedParts.length ? `<p class="gline">어림값: ${s.estimatedParts.map((x) => `${esc(x.label)} (${esc(polite(x.reason || '2차 자료 기준'))})`).join(', ')}</p>` : ''}
    <p class="gline">넣지 않은 것: ${esc(s.excluded.join(', '))}</p>
    ${cta('닫기', 'closeSheet')}`;
}

function sheetCard(id) {
  const c = state.result.cards.find((x) => x.id === id);
  const rules = state.rules;
  const l = cardLine(c) || ['', '', c.title, c.headline];
  const kv = (k, v) => `<div class="amt"><span class="k">${k}</span><span class="n">${v}</span></div>`;
  let body = '';
  if (c.id === 'jobSeekerAllowance') {
    body = kv('지금 받는 수당', won(rules.jobSeekerAllowance.monthlyAllowance)) + (c.paidByMonth
      ? Object.entries(c.paidByMonth).map(([m, p]) => kv(`${m}월에 받는 수당`, won(p))).join('') + (c.totalLoss ? `<div class="amt"><span class="k">기간 동안 줄어드는 수당</span><span class="n minus">−${won(c.totalLoss)}</span></div>` : '')
      : kv('일을 시작하면', won(c.paid)) + (c.impact.max ? `<div class="amt"><span class="k">${esc(c.impact.text)}</span><span class="n minus">−${won(c.impact.max)}</span></div>` : ''));
  }
  // 기준은 긴 문장이라 이름·금액을 점선으로 잇는 한 줄(.amt, 금액은 줄바꿈 없음)에 넣으면 화면 밖으로 넘치고 이름과 겹친다.
  // 그래서 '기준'처럼 제목과 글 줄로 보인다. 개정안이 있으면 지금 기준 다음에 적는다.
  if (c.proposed) body += `<p class="sec">지금 기준</p><p class="gline">${esc(c.limitText)}</p><p class="sec">개정안 (국회 미확정)</p><p class="gline">${esc(c.proposed.limitText)}</p>`;
  else if (c.limitText) body += `<p class="sec">기준</p><p class="gline">${esc(c.limitText)}</p>`;
  return `<h2 id="sheet-title">${esc(l[2])} ${tag(c.status)}</h2>
    <p class="gline">${esc(polite(c.headline))}</p>${body}
    ${(c.checks || []).length ? `<p class="sec">확인할 것</p>${c.checks.map((t) => `<p class="gline">${esc(polite(t))}</p>`).join('')}` : ''}
    ${c.notes.length ? `<p class="sec">알아 둘 것</p>${c.notes.map((t) => `<p class="gline">${esc(polite(t))}</p>`).join('')}` : ''}
    <p class="sec">근거</p>${c.sources.map((sid) => rules.sources[sid]).filter(Boolean).map((s) => `<p class="gline"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></p>`).join('')}
    ${cta('닫기', 'closeSheet')}`;
}

// ---------------- 사용 기록 (공개 체험 주소에서만) ----------------
// CLARITY_ID가 있을 때만 쓴다. 동의한 사람에게만 Clarity를 불러오고, 화면 본문(입력값·금액)은 가려서 보낸다.
// 동의 여부는 이 브라우저에만 저장한다. 저장소를 못 쓰면 매번 묻고, 동의 전에는 아무것도 보내지 않는다.
const CONSENT_KEY = 'munteok-clarity-consent';
function consentChoice() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } }
function saveConsent(v) { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) { /* 저장하지 못해도 이번 방문에는 고른 대로 동작한다 */ } }
let clarityOn = false;
let trackedStep = null;
function startClarity() {
  if (!CLARITY_ID || clarityOn) return;
  // 본문과 아래 창은 글자를 가린다. 위쪽 단계 표시와 아래 버튼 이름만 보인다.
  app.setAttribute('data-clarity-mask', 'True');
  sheetEl.setAttribute('data-clarity-mask', 'True');
  window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.clarity.ms/tag/${encodeURIComponent(CLARITY_ID)}`;
  document.head.appendChild(s);
  window.clarity('consent');
  clarityOn = true;
  trackedStep = null;
}
// 한 주소 안에서 화면만 바뀌므로, 화면이 바뀔 때마다 단계 이름을 이벤트로 남겨 어디서 멈추는지 본다.
function trackStep() {
  if (!clarityOn || state.step === trackedStep) return;
  trackedStep = state.step;
  window.clarity('event', `step_${state.step}`);
  window.clarity('set', 'step', state.step);
}
function withdrawConsent() {
  saveConsent('no');
  // Clarity 쿠키를 지우고 새로 불러 기록을 멈춘다.
  for (const name of ['_clck', '_clsk']) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${location.hostname}`;
  }
  location.reload();
}
function sheetConsent() {
  // 두 버튼을 같은 모양으로 둬서 어느 쪽도 떠밀지 않는다.
  const btn = (label, value) => `<button type="button" class="cta weak eq" data-action="consent" data-value="${value}">${label}</button>`;
  return `<h2 id="sheet-title">사용 기록을 모아도 될까요?</h2>
    <p class="gline">한끗을 더 쉽게 고치려고, 어느 화면에서 무엇을 눌렀는지와 스크롤을 Microsoft Clarity로 모아요.</p>
    <p class="gline">입력한 값과 계산 금액은 가려서 보내지 않아요. 쿠키를 쓰고, 기록은 Microsoft(미국) 서버에 보관돼요. 동의하지 않아도 모든 기능을 똑같이 쓸 수 있어요.</p>
    <p class="gline"><button type="button" class="inline" data-action="consentPrivacy">개인정보 처리 안내</button>에서 언제든 바꿀 수 있어요.</p>
    ${two(btn('동의하지 않아요', 'no'), btn('동의해요', 'yes'))}`;
}

// 위 '처음 화면으로' 버튼: 지울 입력이 있으면 먼저 묻는다. 처음 화면으로 가면 입력을 모두 지운다('내 입력 모두 지우기'와 같음).
function sheetHome() {
  // '내 입력 모두 지우기'(시작 전 준비·개인정보 안내)도 지울 입력이 있으면 같은 창으로 먼저 묻는다.
  if (state.sheet && state.sheet.clear) {
    return `<h2 id="sheet-title">입력을 모두 지울까요?</h2>
    <p class="gline">지금까지 넣은 조건과 답이 모두 지워지고 처음 화면으로 가요.</p>
    ${two(weak('그대로 두기', 'closeSheet'), cta('모두 지우기', 'goHome'))}`;
  }
  return `<h2 id="sheet-title">처음 화면으로 갈까요?</h2>
    <p class="gline">처음 화면으로 가면 지금까지 넣은 조건과 답이 모두 지워져요.</p>
    ${two(weak('계속하기', 'closeSheet'), cta('처음으로 가기', 'goHome'))}`;
}
// 지울 입력이 있는지: 받은 제안, 붙여 넣은 글·사진, 직접 입력한 값, 읽거나 넣은 조건 중 하나라도 있으면 묻는다.
function hasWork() {
  const f = state.fields;
  const m = state.manual;
  const raw = document.getElementById('raw');
  return state.offers.length > 0 || Boolean((raw ? raw.value : state.rawText || '').trim()) || (state.photoFiles || []).length > 0
    || Boolean(m && (m.wage || m.edate || m.dates.length))
    || Boolean(f && ['hourlyWage', 'weeklyHours', 'startMonth', 'months'].some((k) => f[k] && f[k].value !== null && f[k].value !== undefined));
}

// 아래 창은 부드럽게 올라오고(0.25초) 내려간다(0.2초). 열려 있는 동안 내용만 바뀔 때는 다시 움직이지 않는다.
let sheetOpen = false;
let sheetTimer = null;
// 창을 닫으면 창을 연 버튼으로 키보드 초점을 돌려준다. 그 사이 화면을 다시 그렸으면 같은 동작·같은 값의 버튼을 찾는다.
let sheetOpener = null;
let lastActionEl = null;
const openerKey = (el) => ['action', 'key', 'id', 'i'].map((k) => (el.dataset && el.dataset[k] ? `[data-${k}="${el.dataset[k]}"]` : '')).join('');
function returnFocus() {
  const o = sheetOpener;
  sheetOpener = null;
  if (!o) return;
  const target = o.el.isConnected ? o.el : o.key ? document.querySelector(`#app ${o.key}, #bar ${o.key}`) : null;
  if (target) target.focus({ preventScroll: true });
}
function renderSheet() {
  const sh = state.sheet;
  clearTimeout(sheetTimer);
  if (!sh) {
    const wasOpen = sheetOpen;
    sheetOpen = false;
    document.documentElement.classList.remove('sheet-open');
    if (wasOpen) returnFocus();
    sheetEl.classList.remove('opening');
    if (!wasOpen || reduceMotion()) { sheetEl.hidden = true; sheetEl.innerHTML = ''; sheetEl.classList.remove('closing'); return; }
    sheetEl.classList.add('closing');
    sheetTimer = setTimeout(() => { sheetEl.hidden = true; sheetEl.innerHTML = ''; sheetEl.classList.remove('closing'); }, 200);
    return;
  }
  const opening = !sheetOpen;
  sheetOpen = true;
  if (opening) {
    const a = document.activeElement;
    // 화면이 바뀔 때 초점을 받은 제목(h1)은 창을 연 버튼이 아니다(Safari는 누른 버튼에 초점을 주지 않는다).
    const o = a && a !== document.body && a.tagName !== 'H1' && !sheetEl.contains(a) ? a : lastActionEl;
    sheetOpener = o && o.dataset ? { el: o, key: openerKey(o) } : null;
    document.documentElement.classList.add('sheet-open');
  }
  sheetEl.classList.remove('closing', 'opening');
  const body = sh.type === 'consent' ? sheetConsent() : sh.type === 'home' ? sheetHome() : sh.type === 'edit' ? sheetEdit(sh.key) : sh.type === 'amounts' ? sheetAmounts() : sheetCard(sh.id);
  sheetEl.hidden = false;
  sheetEl.innerHTML = `<div class="dim" data-action="closeSheet"></div><div class="panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1"><div class="hdl" aria-hidden="true"></div>${body}</div>`;
  if (opening && !reduceMotion()) { void sheetEl.offsetWidth; sheetEl.classList.add('opening'); }
  // 기간 창은 개월 버튼이 먼저라 일수 칸에 바로 커서를 두지 않는다. "한 달보다 짧아요"로 열었거나 이미 일수면 일수 칸에 둔다.
  const monthsFirst = sh.type === 'edit' && sh.key === 'months' && !sh.unit && !state.fields.months.unit;
  ((monthsFirst ? null : sheetEl.querySelector('.panel input')) || sheetEl.querySelector('.panel'))?.focus({ preventScroll: true });
}

// ---------------- 그리기 ----------------

// 새로고침해도 입력이 남도록 이 탭의 세션 저장소에 둔다. 탭을 닫으면 지워지고 서버로는 보내지 않는다.
const STORE_KEY = 'munteok-state-v2';
const SAVED_KEYS = ['step', 'mode', 'rawText', 'fields', 'profile', 'offers', 'editing', 'active', 'sample', 'extractedBy', 'manual', 'returnToConfirm', 'reviewed', 'reviewTotal', 'profileQ', 'chosenHours', 'requestAction'];

function persist() {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(SAVED_KEYS.map((k) => [k, state[k]]))));
  } catch (e) { /* 저장소를 쓸 수 없으면 저장 없이 동작한다 */ }
}

function restore() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
    if (!saved || !VIEWS[saved.step]) return;
    Object.assign(state, saved);
    if (['compare', 'result', 'alts', 'message', 'basis'].includes(state.step)) {
      if (!state.offers.length) { state.step = 'start'; return; }
      recalculate();
      openOffer(Math.min(state.active || 0, state.offers.length - 1), true);
    }
    if (state.step === 'confirm' && !state.fields) state.step = state.offers.length ? 'offers' : 'start';
  } catch (e) {
    sessionStorage.removeItem(STORE_KEY);
    state.step = 'start';
  }
}

function recalculate() {
  const maxHours = state.profile.maxHours || 40;
  state.comparison = compareOffers(state.offers.map((o) => ({ name: o.name, job: jobOf(o.fields), meta: metaOf(o.fields) })), state.profile, state.rules, { maxHours });
}

function openOffer(i, keepChoice = false) {
  const job = jobOf(state.offers[i].fields);
  state.active = i;
  state.result = state.comparison.rows[i].result;
  // 날짜를 하나씩 고른 제안은 "주 N시간이면?" 비교가 맞지 않아 근무시간 바꿔 보기를 쓰지 않는다.
  state.alts = job.workDates ? null : searchAlternatives(job, state.profile, state.rules, { maxHours: state.profile.maxHours || 40 });
  if (!keepChoice) { state.chosenHours = null; state.requestAction = null; }
}

const VIEWS = { start: viewStart, upload: viewUpload, samples: viewSamples, input: viewInput, confirm: viewConfirm, offers: viewOffers, profile: viewProfile, compare: viewCompare, result: viewResult, alts: viewAlts, message: viewMessage, basis: viewBasis, privacy: viewPrivacy };

function topHtml(v) {
  if (v.top === 'logo') return `<button type="button" class="logo" data-action="home" aria-label="한끗 처음 화면">${LOGO}</button><span class="tagline">한 끗 차이로 달라지는 내 돈, 일하기 전에 확인해요</span>`;
  const group = STEP_GROUP[state.step];
  // 단계 이름 줄은 화면 읽기 프로그램이 두 번 읽지 않게 숨기고, 막대의 aria-valuetext로 지금 단계 이름을 알린다.
  const seg = group === undefined ? '' : `<div class="seg-wrap"><div class="seg" role="progressbar" aria-label="진행 단계: ${STEP_NAMES[group]} (6단계 중 ${group + 1}단계)" aria-valuemin="1" aria-valuemax="6" aria-valuenow="${group + 1}" aria-valuetext="${STEP_NAMES[group]} (6단계 중 ${group + 1}단계)">${Array.from({ length: 6 }, (_, i) => `<i class="${i < group ? 'on' : i === group ? 'now' : ''}"></i>`).join('')}</div><div class="seg-names" aria-hidden="true">${STEP_NAMES.map((n, i) => `<span class="${i === group ? 'on' : ''}">${n}</span>`).join('')}</div></div>`;
  return `<button type="button" class="backb" data-action="back">${icon('back')}<span>뒤로</span></button><button type="button" class="backb homeb" data-action="homeAsk" aria-label="처음 화면으로">${icon('home')}</button>${seg}`;
}

// ---------------- 움직임 ----------------
// 화면이 바뀔 때만 움직인다. 같은 화면을 다시 그릴 때(고르기, 입력)는 움직이지 않는다. 동작 줄이기 설정이면 모두 끈다.
const reduceMotion = () => Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
// PC 첫 화면의 배경 영상(js/bgvideo.js)은 5초 넘게 저절로 움직여서 '움직임 멈춤'으로 멈출 수 있게 한다(다시 누르면 다시 움직임).
// 다른 화면 여백에 떠다니던 동전·지폐는 사용자 요청(2026-11-23, docs/intent/hankkeut-pc-wide.md)으로 지웠다.
// 누르기 전에는 기기 설정을 따르고(동작 줄이기면 처음부터 멈춤), 누른 뒤에는 이 탭을 닫을 때까지 고른 대로 둔다.
// body[data-motion]: auto(기기 설정대로) · on · off. 멈추면 그 자리에 선다(style.css).
const MOTION_KEY = 'hankkeut-motion';
let motionChoice = null;
try { motionChoice = sessionStorage.getItem(MOTION_KEY); } catch (e) { /* 무시 */ }
if (motionChoice !== 'on' && motionChoice !== 'off') motionChoice = null;
document.body.dataset.motion = motionChoice || 'auto';
const motionStopped = () => (motionChoice ? motionChoice === 'off' : reduceMotion());
const motionLabel = () => (motionStopped() ? `${icon('play')}<span>움직임 켜기</span>` : `${icon('pause')}<span>움직임 멈춤</span>`);
// 버튼은 #app 밖에 한 번만 만든다. 보이는지는 css/bgvideo.css가 정한다(배경 영상이 켜진 PC 첫 화면에서만 보임).
// 위쪽 막대 바로 뒤에 둬서 Tab 순서가 위쪽 막대 → 움직임 멈춤 → 내용이다.
const motionBtn = document.createElement('button');
motionBtn.type = 'button';
motionBtn.className = 'motion-btn';
motionBtn.dataset.action = 'motion';
motionBtn.innerHTML = motionLabel();
topEl.after(motionBtn);
function toggleMotion() {
  motionChoice = motionStopped() ? 'on' : 'off';
  document.body.dataset.motion = motionChoice;
  try { sessionStorage.setItem(MOTION_KEY, motionChoice); } catch (e) { /* 무시 */ }
  // 버튼은 그대로 두고 안만 바꿔서 키보드 초점이 남는다.
  motionBtn.innerHTML = motionLabel();
}
// 고르기 전에 기기의 동작 줄이기 설정이 바뀌면 버튼 글자도 맞춘다.
const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
if (reduceQuery && reduceQuery.addEventListener) reduceQuery.addEventListener('change', () => { if (!motionChoice) motionBtn.innerHTML = motionLabel(); });
let shownScreen = null;
let screenChangedAt = 0; // 화면이 바뀐 시각. 빠르게 두 번 누를 때 두 번째 누르기를 막는 데 쓴다
let countedKey = null;
function screenKey() {
  const s = state.step;
  if (s === 'profile') return `${s}:${state.profileQ}`;
  if (s === 'confirm' && state.fields) return `${s}:${reviewQueue().length + missingFields().length}:${state.editing}`;
  if (s === 'input') return `${s}:${state.mode}:${state.loading ? 1 : 0}:${state.aiError ? state.aiError.kind : ''}`;
  return s;
}
function animateScreen() {
  const key = screenKey();
  const changed = key !== shownScreen;
  shownScreen = key;
  if (changed) screenChangedAt = performance.now();
  app.classList.remove('enter', 'stagger');
  if (changed && !reduceMotion()) {
    void app.offsetWidth; // 애니메이션을 처음부터 다시 시작한다
    if (state.step === 'result') {
      // 결과 화면 카드는 위에서부터 차례로 나타난다.
      let i = 0;
      for (const el of app.children) {
        const items = el.classList.contains('split') ? [...el.children].flatMap((col) => [...col.children]) : [el];
        for (const it of items) it.style.setProperty('--i', Math.min(i++, 8));
      }
      app.classList.add('stagger');
    } else app.classList.add('enter');
  }
  if (state.step === 'result') countUp();
}
// 결과 숫자는 0.5초 동안 0에서 마지막 값까지 한 번만 올라간다. 자리는 마지막 값 너비로 미리 잡아 글자가 밀리지 않게 한다.
function countUp() {
  const els = [...app.querySelectorAll('.count')];
  if (!els.length) return;
  const key = `${state.active}:${els.map((e) => e.dataset.to).join(',')}`;
  if (key === countedKey) return;
  countedKey = key;
  if (reduceMotion()) return;
  for (const el of els) {
    const to = Number(el.dataset.to);
    const cv = el.querySelector('.cv');
    if (!cv || !(to > 0)) continue;
    cv.style.minWidth = `${cv.getBoundingClientRect().width}px`;
    cv.textContent = '0';
    // 시작 시각은 첫 프레임에서 잡는다. 프레임 시각이 앞설 수 있어 미리 잡으면 음수가 잠깐 보인다.
    let t0 = null;
    const tick = (now) => {
      if (t0 === null) t0 = now;
      const p = Math.max(0, Math.min(1, (now - t0) / 500));
      if (p < 1 && cv.isConnected) {
        cv.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('ko-KR');
        requestAnimationFrame(tick);
      } else { cv.textContent = to.toLocaleString('ko-KR'); cv.style.minWidth = ''; }
    };
    requestAnimationFrame(tick);
  }
}

// PC 세로 자리: 내용과 아래 버튼을 합친 묶음이 화면보다 짧으면, 남는 높이를 위 2 : 아래 3으로 나눠 묶음을 가운데보다 조금 위에 둔다.
// 화면이 바뀔 때(와 창 크기가 바뀔 때)만 정한다. 같은 화면에서 안내가 펼쳐지거나 접혀도 위 여백을 그대로 둬서,
// 방금 누른 버튼이 움직이지 않고 내용만 아래로 늘어난다. 휴대폰과 시작 화면(스스로 가운데 정렬)은 하지 않는다.
const pcQuery = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : null;
let placedKey = null;
function placeVertically(force = false) {
  const key = screenKey();
  if (!force && key === placedKey) return;
  placedKey = key;
  app.style.marginTop = '';
  if (!pcQuery || !pcQuery.matches || state.step === 'start') return;
  const free = window.innerHeight - topEl.offsetHeight - app.offsetHeight - (barEl.hidden ? 0 : barEl.offsetHeight);
  if (free > 0) app.style.marginTop = `${Math.round(free * 0.4)}px`;
}
let placeTimer = null;
window.addEventListener('resize', () => { clearTimeout(placeTimer); placeTimer = setTimeout(() => placeVertically(true), 120); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeVertically(true));
// PC 질문 화면(질문 1~6, 조건 확인 질문, 공고에 없는 것 묻기 = 단계 표시가 있는 두 칸 화면): 오른쪽 고르는 칸(.cb)이
// 왼쪽 묶음('질문 n/6'부터 '계산할 조건'까지)보다 짧으면 그 묶음의 세로 가운데에 둔다. 길면 지금처럼 맨 위를 단계 표시에 맞춘다.
// placeVertically처럼 화면이 바뀔 때(와 창 크기·글꼴이 바뀔 때)만 정한다. 같은 화면에서 안내가 펼쳐지면 위 여백을 그대로 둬서
// 방금 누른 버튼이 움직이지 않고 칸이 아래로만 늘어난다. 휴대폰은 하지 않는다.
let answerKey = null;
let answerShift = 0;
function centerAnswer(force = false) {
  const cb = app.querySelector(':scope > .step ~ .cb');
  if (cb) cb.style.marginTop = '';
  const key = screenKey();
  if (force || key !== answerKey) {
    answerKey = key;
    answerShift = 0;
    if (cb && pcQuery && pcQuery.matches) {
      const left = [...app.children].filter((el) => el !== cb && el.getClientRects().length);
      const top = app.querySelector(':scope > .step').getBoundingClientRect().top;
      const bottom = Math.max(...left.map((el) => el.getBoundingClientRect().bottom));
      const r = cb.getBoundingClientRect();
      answerShift = Math.max(0, Math.round(top + (bottom - top - r.height) / 2 - r.top));
    }
  }
  if (cb && answerShift) cb.style.marginTop = `${parseFloat(getComputedStyle(cb).marginTop) + answerShift}px`;
}
let answerTimer = null;
window.addEventListener('resize', () => { clearTimeout(answerTimer); answerTimer = setTimeout(() => centerAnswer(true), 120); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => centerAnswer(true));

function render(keepScroll = false) {
  const y = window.scrollY;
  const v = VIEWS[state.step]();
  document.body.dataset.step = state.step;
  // PC 배치: c2 = 두 칸(오른쪽 칸은 .cb), c1 = 왼쪽 선에 맞춘 한 칸. 시작·결과·비교 화면은 각자 배치를 쓴다.
  document.body.dataset.layout = v.layout || '';
  topEl.innerHTML = topHtml(v);
  app.innerHTML = v.html;
  barEl.innerHTML = v.bottom || '';
  barEl.hidden = !v.bottom;
  app.style.paddingBottom = v.bottom ? `${barEl.offsetHeight + 24}px` : '32px';
  centerAnswer();
  placeVertically();
  renderSheet();
  window.scrollTo(0, keepScroll ? y : 0);
  const firstPaint = shownScreen === null;
  const changed = screenKey() !== shownScreen;
  animateScreen();
  // 화면이 바뀌면 키보드 초점을 새 화면 제목으로 옮겨 화면 읽기 프로그램이 새 화면을 알게 한다(초점이 body로 빠지지 않게).
  // 처음 열 때와 아래 창이 열려 있을 때는 옮기지 않는다. 같은 화면을 다시 그릴 때는 각 동작이 정한 곳에 초점을 둔다.
  if (changed && !firstPaint && !state.sheet) {
    const h = app.querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  persist();
  trackStep();
  armBack();
}

// ---------------- 동작 ----------------

function saveProfileInputs() {
  const num = (id) => { const el = document.getElementById(id); return el ? (el.value !== '' ? Number(el.value) : null) : undefined; };
  const max = num('p-max');
  if (max !== undefined) state.profile.maxHours = max ? Math.min(52, Math.max(1, Math.round(max))) : null;
  const age = num('p-age');
  if (age !== undefined) state.profile.age = age;
  if (document.getElementById('y-wage')) state.profile.ytdIncome = { wage: num('y-wage') || 0, business: num('y-business') || 0, daily: num('y-daily') || 0 };
}

function back() {
  const s = state.step;
  state.aiError = null; state.inputHint = null; state.profileError = null;
  if (s === 'privacy') state.step = state.returnStep || 'start';
  else if (s === 'upload') state.step = state.offers.length ? 'offers' : 'start';
  else if (s === 'input' && state.returnToConfirm && state.fields) { state.step = 'confirm'; state.returnToConfirm = false; }
  else if (s === 'samples' || s === 'input') state.step = 'upload';
  else if (s === 'confirm') {
    if (state.reviewed.length && reviewQueue().length + missingFields().length < state.reviewTotal) state.reviewed.pop();
    else state.step = state.editing !== null ? 'offers' : 'upload';
  // 저장한 제안 화면에서는 첫 화면으로 간다. 공고 올리기 화면은 저장한 제안이 있으면 이 화면으로 오므로,
  // 여기서 다시 공고 올리기로 보내면 두 화면 사이를 맴돈다. 제안을 더 넣을 때는 '제안 더하기'를 쓴다.
  } else if (s === 'offers') state.step = 'start';
  else if (s === 'profile') { saveProfileInputs(); if (state.profileQ > 0) state.profileQ -= 1; else state.step = 'offers'; }
  else if (s === 'compare') { state.step = 'profile'; state.profileQ = profileQuestions().length - 1; }
  else if (s === 'result') { if (state.offers.length > 1) state.step = 'compare'; else { state.step = 'profile'; state.profileQ = profileQuestions().length - 1; } }
  else if (s === 'alts' || s === 'basis') state.step = 'result';
  else if (s === 'message') state.step = 'alts';
  else state.step = 'start';
}

// 브라우저·휴대폰 뒤로가기를 앱의 '뒤로'로 쓴다. 첫 화면이 아니면 방문 기록을 하나 쌓아 두고(armBack), 뒤로가기로
// 그 기록이 빠지면 아래 창을 닫거나 한 단계 뒤로 간다. 첫 화면에서 누르면 그대로 앱 밖(이전 페이지)으로 나간다.
let backArmed = Boolean(history.state && history.state.hk);
function armBack() {
  if (state.step === 'start' || backArmed) return;
  try { history.pushState({ hk: 1 }, ''); backArmed = true; } catch (e) { /* 기록을 쓸 수 없으면 뒤로가기는 전처럼 앱 밖으로 나간다 */ }
}
window.addEventListener('popstate', () => {
  backArmed = Boolean(history.state && history.state.hk);
  if (state.sheet) { state.sheet = null; renderSheet(); armBack(); return; }
  if (state.step === 'start') { history.back(); return; }
  back();
  render();
});

function resetAll() {
  Object.assign(state, { step: 'start', sample: null, rawText: '', fields: null, profile: clone(EMPTY_PROFILE), result: null, alts: null, aiError: null, offers: [], editing: null, comparison: null, reviewed: [], reviewTotal: 0, profileQ: 0, ytdOpen: false, chosenHours: null, requestAction: null, sheet: null, photoFiles: [], manual: null, returnToConfirm: false });
  try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* 무시 */ }
}

// 사진을 긴 변 1600px 이하 JPEG로 줄여 base64로 바꾼다. 전송량과 비용을 줄이기 위해서다.
// 여러 장의 합이 PHOTO_BUDGET을 넘으면 긴 변 1280px, 품질 0.8로 한 번 더 줄인다.
function imageToBase64(file, side = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, side / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('사진 파일을 열지 못했어요')); };
    img.src = url;
  });
}

async function tryExtract() {
  const raw = document.getElementById('raw');
  if (raw) state.rawText = raw.value;
  state.aiError = null; state.inputHint = null;
  const body = {};
  if (state.mode === 'photo') {
    const files = state.photoFiles || [];
    if (!files.length) { state.inputHint = '사진을 먼저 골라 주세요'; render(true); return; }
    try {
      let images = await Promise.all(files.map((f) => imageToBase64(f)));
      if (images.reduce((sum, d) => sum + d.length, 0) > PHOTO_BUDGET) images = await Promise.all(files.map((f) => imageToBase64(f, 1280, 0.8)));
      // 1장이면 예전과 똑같은 형식(image)으로 보내 지금까지와 같이 읽는다. 여러 장일 때만 images로 보낸다.
      if (images.length === 1) body.image = { mediaType: 'image/jpeg', data: images[0] };
      else body.images = images.map((data) => ({ mediaType: 'image/jpeg', data }));
    } catch (e) { state.aiError = { kind: 'photo', detail: e.message }; render(); return; }
    state.rawText = '';
  } else {
    if (!state.rawText.trim()) { state.inputHint = '공고나 메시지를 붙여 넣어 주세요'; render(true); return; }
    // AI 서버는 4,000자까지 받는다. 넘으면 보내지 않고 줄여 달라고 안내한다.
    if (state.rawText.length > MAX_TEXT) { state.aiError = { kind: 'tooLong', detail: '' }; render(); return; }
    body.text = state.rawText;
  }
  if (!AI_AVAILABLE) { state.aiError = { kind: 'server', detail: '이 주소에서는 AI 서버가 연결되지 않았어요' }; render(); return; }
  state.loading = true;
  render();
  try {
    const res = await fetch(API_BASE + 'api/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const kind = res.status === 422 ? 'notPosting' : state.mode === 'photo' && res.status === 400 ? 'photo' : res.status === 413 && state.mode !== 'photo' ? 'tooLong' : 'server';
      throw Object.assign(new Error(data.error || ''), { kind });
    }
    state.fields = markYearEnd(withDefaults(data.fields));
    state.extractedBy = data.model || 'AI';
    state.sample = null;
    beginReview();
    state.step = 'confirm';
  } catch (e) {
    state.aiError = { kind: e.kind || (state.mode === 'photo' ? 'photo' : 'server'), detail: e.kind === 'server' || e instanceof TypeError ? '' : '' };
  }
  state.loading = false;
  render();
}

// 주휴수당 포함 여부는 공고에 잘 적히지 않는다. 값이 없으면 "시급과 별도"로 가정하고 추정으로 표시한다.
function withDefaults(fields) {
  if (!fields.holidayIncluded) fields.holidayIncluded = { value: false, status: STATUS.ESTIMATED, evidence: '적혀 있지 않아 시급과 별도로 지급된다고 가정' };
  return fields;
}
// AI가 끝이 정해지지 않은 기간을 연말까지로 읽었으면(추정, 12월에 끝남) 시작 달을 고쳐도 연말까지를 따라가게 표시한다.
function markYearEnd(fields) {
  const start = Number(fields.startMonth && fields.startMonth.value);
  const m = fields.months;
  if (m && m.status === STATUS.ESTIMATED && start >= 1 && start <= 12 && m.value === 13 - start) m.toYearEnd = true;
  return fields;
}
function emptyFields() {
  const blank = (v) => ({ value: v, status: STATUS.CHECK, evidence: '' });
  return withDefaults({ hourlyWage: blank(null), weeklyHours: blank(null), startMonth: blank(null), months: blank(null), incomeType: blank('unknown') });
}

// 직접 입력에서 빈칸이나 범위를 벗어난 값으로 '조건 확인하기'를 누르면, 브라우저 말풍선(브라우저마다 다르고 놓치기 쉬움)과 함께
// 그 칸 바로 아래에 이유를 적는다. 그 폼에서 다시 입력하면 지운다.
document.addEventListener('invalid', (e) => {
  const t = e.target;
  if (!t.closest || !t.closest('#manual') || document.getElementById('m-invalid')) return;
  const name = t.labels && t.labels[0] ? t.labels[0].textContent.trim() : '이 칸';
  const msg = t.id === 'm-wage' ? '시급을 1~999,999원 사이로 넣어 주세요'
    : t.id === 'm-tstart' || t.id === 'm-tend' ? '출근·퇴근 시간을 넣어 주세요'
      // 끝나는 날을 직접 쳐서 시작일보다 앞서면 '확인해 주세요' 대신 무엇이 틀렸는지 알린다.
      : t.id === 'm-edate' && t.validity.rangeUnderflow ? '끝나는 날이 시작일보다 앞서요'
      : (t.id === 'm-sdate' || t.id === 'm-edate') && (t.validity.rangeUnderflow || t.validity.rangeOverflow) ? `${name}은 ${t.min.slice(0, 4)}년 ${Number(t.min.slice(5, 7))}월 ${Number(t.min.slice(8, 10))}일부터 ${t.max.slice(0, 4)}년 ${Number(t.max.slice(5, 7))}월 ${Number(t.max.slice(8, 10))}일 사이로 골라 주세요`
      : t.validity.customError ? t.validationMessage : t.validity.valueMissing ? `${name}을 넣어 주세요` : `${name}을 확인해 주세요`;
  const p = document.createElement('p');
  p.id = 'm-invalid'; p.className = 'gline warn'; p.setAttribute('role', 'alert'); p.textContent = msg;
  (t.closest('.unit') || t).insertAdjacentElement('afterend', p);
}, true);
document.addEventListener('input', (e) => {
  if (!e.target.closest || !e.target.closest('#manual')) return;
  document.getElementById('m-invalid')?.remove();
  for (const x of document.querySelectorAll('#manual [aria-invalid]')) x.removeAttribute('aria-invalid');
});

app.addEventListener('submit', (e) => {
  if (e.target.id !== 'manual') return;
  e.preventDefault();
  const set = (v) => ({ value: v, status: STATUS.CONFIRMED, evidence: '직접 입력' });
  const g = (id) => document.getElementById(id);
  const m = manual();
  m.wage = g('m-wage').value;
  const calc = g('m-calc');
  const stop = (msg) => { calc.innerHTML = `<span class="warn">${msg}</span>`; calc.scrollIntoView({ block: 'center' }); };
  // 날짜 칸은 브라우저 빈칸 검사에 맡기지 않는다. 브라우저는 빈 날짜 칸에 커서를 넣으며 화면을 그 칸으로 끌어 올리고,
  // 휴대폰에서는 날짜판까지 열려 화면이 튄다. 두 칸 아래에 이유를 적고 칸에 빨간 테두리를 두며, 칸이 화면 밖일 때만 보이게 옮긴다.
  const stopDate = (id, msg) => {
    document.getElementById('m-invalid')?.remove();
    const input = g(id);
    input.setAttribute('aria-invalid', 'true');
    const pair = input.closest('.pair');
    const p = document.createElement('p');
    p.id = 'm-invalid'; p.className = 'gline warn'; p.setAttribute('role', 'alert'); p.textContent = msg;
    pair.insertAdjacentElement('afterend', p);
    const barTop = barEl.hidden ? window.innerHeight : barEl.getBoundingClientRect().top;
    if (pair.getBoundingClientRect().top < topEl.getBoundingClientRect().bottom || p.getBoundingClientRect().bottom > barTop) {
      pair.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
  };
  const daily = dailyHoursOf(m);
  if (!daily) return stop(timeProblem(m));
  const sched = { start: m.start, end: m.end, breakMin: m.breakMin };
  let weeklyHours;
  let months;
  let first;
  if (m.how === 'pattern') {
    if (!m.days.length) return stop('일하는 요일을 골라 주세요');
    if (!m.sdate) return stopDate('m-sdate', '시작일을 골라 주세요');
    if (!m.edate) return stopDate('m-edate', '끝나는 날을 골라 주세요. 정해지지 않았으면 아래 \'연말까지\'를 눌러요');
    if (m.edate < m.sdate) return stopDate('m-edate', '끝나는 날이 시작일보다 앞서요');
    weeklyHours = { ...set(Math.round(daily * m.days.length * 100) / 100), how: 'pattern', sched: { ...sched, days: [...m.days] } };
    months = { ...set(daysBetween(m.sdate, m.edate)), unit: 'date', start: m.sdate, end: m.edate };
    first = m.sdate;
  } else {
    if (!m.dates.length) return stop('달력에서 일하는 날을 골라 주세요');
    const dates = [...m.dates].sort();
    weeklyHours = { ...set(pickedWeekHours(dates, daily)), how: 'picked', daily, sched };
    months = { ...set(dates.length), unit: 'picked', dates };
    first = dates[0];
  }
  state.fields = withDefaults({
    hourlyWage: set(Number(m.wage)),
    weeklyHours,
    startMonth: set(Number(first.slice(5, 7))),
    months,
    incomeType: m.type === 'unknown' ? { value: 'unknown', status: STATUS.CHECK, evidence: '모른다고 답함' } : set(m.type),
    holidayIncluded: set(m.type === 'wage' && m.holiday === true),
  });
  Object.assign(state, { rawText: '', sample: null, extractedBy: null, step: 'confirm', returnToConfirm: false });
  beginReview();
  render();
});

// 고르거나 끌어다 놓은 사진을 더한다. 사진 파일만, 같은 사진은 한 번만, 3장까지 받는다.
function addPhotos(list) {
  const picked = [...list];
  const imgs = picked.filter((f) => f.type && f.type.startsWith('image/'));
  const key = (f) => `${f.name}:${f.size}:${f.lastModified}`;
  const merged = [...(state.photoFiles || [])];
  for (const f of imgs) if (!merged.some((g) => key(g) === key(f))) merged.push(f);
  state.photoFiles = merged.slice(0, MAX_PHOTOS);
  state.inputHint = picked.length && !imgs.length ? '사진 파일만 올릴 수 있어요'
    : merged.length > MAX_PHOTOS ? `사진은 ${MAX_PHOTOS}장까지 올릴 수 있어요. 앞의 ${MAX_PHOTOS}장만 넣었어요` : null;
  render(true);
}
// 사진을 끌어다 놓기: 사진 올리기 화면에서는 창 어디에 놓아도 들어가고, 공고 올리기 화면에 놓으면 사진 올리기로 넘어간다.
// 공고를 읽는 동안이나 안내 화면에서는 받지 않는다(브라우저가 사진 파일을 열어 입력이 사라지지 않게 막기만 한다).
const draggingFiles = (e) => Boolean(e.dataTransfer) && [...(e.dataTransfer.types || [])].includes('Files');
const photoDropOk = () => !AI_OFF && (state.step === 'upload' || (state.step === 'input' && state.mode === 'photo' && !state.loading && !state.aiError));
let dragDepth = 0;
function dropMark(on) { document.getElementById('drop')?.classList.toggle('over', on); }
document.addEventListener('dragenter', (e) => {
  if (!draggingFiles(e) || !['upload', 'input'].includes(state.step)) return;
  e.preventDefault(); dragDepth += 1; if (photoDropOk()) dropMark(true);
});
document.addEventListener('dragover', (e) => {
  if (!draggingFiles(e) || !['upload', 'input'].includes(state.step)) return;
  e.preventDefault(); e.dataTransfer.dropEffect = photoDropOk() ? 'copy' : 'none';
});
document.addEventListener('dragleave', (e) => {
  if (!draggingFiles(e)) return;
  dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dropMark(false);
});
document.addEventListener('drop', (e) => {
  if (!draggingFiles(e) || !['upload', 'input'].includes(state.step)) return;
  e.preventDefault(); dragDepth = 0; dropMark(false);
  if (!photoDropOk()) return;
  if (state.step === 'upload') Object.assign(state, { mode: 'photo', step: 'input', aiError: null, inputHint: null });
  addPhotos(e.dataTransfer.files);
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'photo' && t.files.length) { addPhotos(t.files); return; }
  if (t.dataset.offerName !== undefined) {
    const o = state.offers[Number(t.dataset.offerName)];
    if (o) { o.name = t.value.trim() || o.name; persist(); }
    return;
  }
  if (onHoursSlider(t, true)) return;
  if (onManualInput(t)) return;
  if (state.step === 'profile') { saveProfileInputs(); persist(); }
});
// 시간을 고르는 동안에도 계산이 바로 바뀌게 한다.
document.addEventListener('input', (e) => { onStepperInput(e.target); onManualInput(e.target); onHoursSlider(e.target, false); onYtdInput(e.target); onProfileDraft(e.target); });
// 질문 1·3·5 숫자 칸에 친 값은 칸을 떠나기 전에 새로고침해도 남도록 칠 때마다 저장한다. 다시 그리지 않아 커서가 그대로 남는다.
// 최대 시간은 치는 동안 1~52로 자르거나 반올림하지 않고 친 그대로 둔다(자르기와 검사는 지금처럼 칸을 떠날 때와 '다음'에서 한다).
function onProfileDraft(t) {
  if (state.step !== 'profile' || !['p-max', 'p-age', 'y-wage', 'y-business', 'y-daily'].includes(t.id)) return;
  if (t.id === 'p-max') state.profile.maxHours = t.value !== '' ? Number(t.value) : null;
  else saveProfileInputs();
  persist();
}
// '올해 이미 번 돈' 세 칸 중 하나에 치기 시작하면 '한 칸 이상 적어야' 안내와 빨간 테두리를 지운다. 다시 그리지 않아 커서가 그대로 남는다.
function onYtdInput(t) {
  if (!/^y-(wage|business|daily)$/.test(t.id) || !document.getElementById('y-err')) return;
  state.profileError = null;
  document.getElementById('y-err').remove();
  for (const x of app.querySelectorAll('#y-wage, #y-business, #y-daily')) { x.removeAttribute('aria-invalid'); x.setAttribute('aria-describedby', `${x.id}-h`); }
}
// 숫자 입력(− 값 +): 칠 때마다 칸 폭을 자릿수에 맞추고, cap이 있으면 그보다 큰 수는 들어가지 않게 한다.
function onStepperInput(t) {
  if (!t.matches || !t.matches('.sv input')) return;
  const cap = Number(t.dataset.cap);
  if (cap && t.value !== '') {
    let v = t.value.replace(/\D/g, '').slice(0, String(cap).length);
    if (Number(v) > cap) v = String(cap);
    if (v !== t.value) t.value = v;
  }
  fitNum(t);
}
// 숫자 입력에는 숫자만 친다(브라우저 숫자 칸은 e, +, -, . 도 받는다).
document.addEventListener('keydown', (e) => {
  // 시급·일수·올해 번 돈처럼 다른 숫자 칸도 같다. 'e'(1e5 = 100,000)나 '.'이 쳐지면 값이 말없이 바뀐다.
  if (e.target.matches && e.target.matches('.sv input, input[type="number"]') && e.key.length === 1 && !/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
});

// 직접 입력 화면의 글자 칸과, 기간 고치기 창의 날짜. 다시 그리지 않아 커서가 그대로 남는다.
function onManualInput(t) {
  const fields = { 'm-wage': 'wage', 'm-tstart': 'start', 'm-tend': 'end', 'm-break': 'breakMin', 'm-sdate': 'sdate', 'm-edate': 'edate' };
  if (fields[t.id]) {
    const m = manual();
    m[fields[t.id]] = t.id === 'm-break' ? Number(t.value) : t.value;
    const calc = document.getElementById('m-calc');
    if (calc && ['m-tstart', 'm-tend', 'm-break'].includes(t.id)) calc.innerHTML = manualCalcHtml();
  }
  if (t.id === 'm-sdate' || t.id === 'e-sdate') {
    // 끝나는 날은 시작일보다 앞설 수 없다.
    const end = document.getElementById(t.id === 'm-sdate' ? 'm-edate' : 'e-edate');
    if (end) { end.min = t.value || end.min; end.setCustomValidity(''); }
    return true;
  }
  if (t.id === 'm-edate' || t.id === 'e-edate') { t.setCustomValidity(''); return true; }
  if (fields[t.id]) { persist(); return true; }
  return false;
}

document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"][data-action]')) { e.preventDefault(); e.target.click(); return; }
  if (e.key === 'Escape' && state.sheet) { state.sheet = null; renderSheet(); }
  // 아래에서 올라오는 창 안에서만 Tab이 돌게 한다.
  if (e.key === 'Tab' && state.sheet) {
    const items = [...sheetEl.querySelectorAll('.panel button, .panel input, .panel a')];
    if (!items.length) return;
    const first = items[0]; const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  // 화면이 바뀐 직후 0.35초 동안은 사람이 누른 것을 받지 않는다. 빠르게 두 번 누르면(PC 더블클릭 포함) 두 번째 누르기가
  // 새 화면의 같은 자리 버튼(맞아요·다음·고르는 버튼)을 눌러, 보지 않은 질문을 건너뛰거나 답이 저절로 들어가기 때문이다.
  // 같은 화면 안에서 다시 그릴 때(−/+ 버튼 등)는 화면이 바뀌지 않아 막지 않는다. 코드가 부른 클릭(isTrusted 아님)도 막지 않는다.
  if (e.isTrusted && performance.now() - screenChangedAt < 350 && el.closest('#app, #bar')) { e.preventDefault(); return; }
  lastActionEl = el;
  const a = el.dataset.action;
  const keep = () => render(true);
  switch (a) {
    case 'go': {
      saveProfileInputs();
      const to = el.dataset.step;
      if (to === 'upload' && state.step === 'start') resetAll();
      if (to === 'profile') state.profileQ = state.step === 'offers' || state.step === 'confirm' ? 0 : profileQuestions().length - 1;
      state.step = to; state.aiError = null; state.inputHint = null;
      if (to === 'upload' && !state.fields) state.fields = emptyFields();
      break;
    }
    case 'back': back(); break;
    case 'privacy': state.returnStep = state.step; state.step = 'privacy'; break;
    case 'mode':
      state.mode = el.dataset.mode; state.aiError = null; state.inputHint = null; state.step = 'input';
      break;
    case 'retry': {
      // 서버 문제면 같은 공고를 다시 읽고, 공고가 아니거나 사진을 못 읽었으면 다시 올리는 화면으로 간다.
      const kind = state.aiError && state.aiError.kind;
      state.aiError = null;
      if (kind === 'server') { tryExtract(); return; }
      break;
    }
    case 'extract': tryExtract(); return;
    case 'removePhoto': (state.photoFiles || []).splice(Number(el.dataset.i), 1); state.inputHint = null; keep(); return;
    // 직접 입력: 고를 때마다 state.manual을 바꾸고 화면을 그 자리에서 다시 그린다.
    case 'mHow': manual().how = el.dataset.value; keep(); return;
    case 'mType': manual().type = el.dataset.value; keep(); return;
    case 'mHoliday': manual().holiday = el.dataset.value === 'true'; keep(); return;
    case 'mOpen': {
      const which = el.dataset.value;
      manual()[which === 'break' ? 'openBreak' : 'openHoliday'] = true;
      keep();
      (which === 'break' ? document.getElementById('m-break') : document.querySelector('[data-action="mHoliday"].on'))?.focus();
      return;
    }
    case 'mDay': {
      const m = manual();
      const d = Number(el.dataset.value);
      m.days = m.days.includes(d) ? m.days.filter((x) => x !== d) : [...m.days, d];
      keep();
      return;
    }
    case 'calDay': {
      const m = manual();
      const v = el.dataset.value;
      m.dates = m.dates.includes(v) ? m.dates.filter((x) => x !== v) : [...m.dates, v].sort();
      keep();
      return;
    }
    case 'calMove': {
      const m = manual();
      m.calMonth = Math.min(12, Math.max(1, m.calMonth + Number(el.dataset.value)));
      keep();
      return;
    }
    case 'calQuick': {
      const m = manual();
      const year = state.rules.appliesToYear;
      const prefix = `${year}-${pad2(m.calMonth)}-`;
      const daysIn = new Date(Date.UTC(year, m.calMonth, 0)).getUTCDate();
      const kind = el.dataset.value;
      const keepOthers = m.dates.filter((x) => !x.startsWith(prefix));
      const inMonth = m.dates.filter((x) => x.startsWith(prefix));
      const pick = [];
      for (let d = 1; d <= daysIn; d++) {
        const wd = new Date(Date.UTC(year, m.calMonth - 1, d)).getUTCDay();
        if ((kind === 'weekdays' && wd >= 1 && wd <= 5) || (kind === 'weekend' && (wd === 0 || wd === 6))) pick.push(isoDate(year, m.calMonth, d));
      }
      m.dates = kind === 'clear' ? keepOthers : [...new Set([...keepOthers, ...inMonth, ...pick])].sort();
      keep();
      return;
    }
    case 'mPeriod': {
      const m = manual();
      const year = state.rules.appliesToYear;
      if (!m.sdate) m.sdate = manualDefaults().sdate;
      if (el.dataset.value === 'end') m.edate = `${year}-12-31`;
      else {
        // 시작일에서 n개월 뒤 같은 날의 전날 (예: 11월 20일부터 1개월 → 12월 19일)
        const [y, mo, d] = m.sdate.split('-').map(Number);
        const t = new Date(Date.UTC(y, mo - 1 + Number(el.dataset.value), d) - 86400000);
        m.edate = isoDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
      }
      keep();
      return;
    }
    case 'sample': {
      const s = SAMPLES.find((x) => x.id === el.dataset.id);
      Object.assign(state, { sample: s.id, rawText: s.text, extractedBy: null, fields: withDefaults(clone(s.extraction)), profile: clone(s.profile), offers: [], editing: null, step: 'confirm' });
      beginReview();
      break;
    }
    case 'samplePair': {
      const pick = (id) => { const x = SAMPLES.find((y) => y.id === id); return { name: SAMPLE_TEXT[id][0], fields: withDefaults(clone(x.extraction)), rawText: x.text, extractedBy: null }; };
      Object.assign(state, { offers: [pick('cafe'), pick('tutor')], profile: clone(SAMPLES[0].profile), editing: null, fields: null, sample: null, step: 'offers' });
      break;
    }
    case 'reviewOk': state.reviewed.push(el.dataset.key); break;
    case 'answer': {
      const key = el.dataset.key; const value = el.dataset.value;
      // 한 달보다 짧으면 일수를 넣는 창을 연다.
      if (key === 'months' && value === 'day') { state.sheet = { type: 'edit', key: 'months', unit: 'day' }; renderSheet(); return; }
      if (key === 'incomeType') state.fields.incomeType = value === 'unknown' ? { value: 'unknown', status: STATUS.CHECK, evidence: '모른다고 답함' } : { value, status: STATUS.CONFIRMED, evidence: '직접 답함' };
      // "연말까지"와 "모르겠어요"는 시작 달에서 12월까지로 센다 (예: 3월 시작이면 10개월). 시작 달을 나중에 고쳐도 맞춰진다.
      else if (key === 'months' && value === 'end') state.fields.months = { value: monthsToYearEnd(), toYearEnd: true, status: STATUS.CONFIRMED, evidence: '연말까지라고 답함' };
      else if (key === 'months' && value === '0') state.fields.months = { value: monthsToYearEnd(), toYearEnd: true, status: STATUS.ESTIMATED, evidence: '모른다고 답해 연말까지로 가정' };
      else if (key === 'holidayIncluded') { state.fields.holidayIncluded = { value: value === 'true', status: STATUS.CONFIRMED, evidence: '직접 답함' }; state.reviewed.push(key); }
      else state.fields[key] = { value: Number(value), status: STATUS.CONFIRMED, evidence: '직접 답함' };
      if (key === 'startMonth') syncYearEnd();
      if (key === 'months' && value === '0') state.reviewed.push('months');
      break;
    }
    case 'editField': {
      const key = el.dataset.key;
      // 직접 입력한 시간·기간은 직접 입력 화면으로 돌아가 고친다. 그 밖에는 아래 창에서 고친다.
      if ((key === 'weeklyHours' || key === 'months') && state.fields.weeklyHours.how) {
        Object.assign(state, { manual: fieldsToManual(state.fields), mode: 'manual', step: 'input', returnToConfirm: true });
        break;
      }
      state.sheet = { type: 'edit', key };
      renderSheet();
      return;
    }
    case 'sheetPick': {
      const key = state.sheet.key; const raw = el.dataset.value;
      const value = key === 'incomeType' ? raw : key === 'holidayIncluded' ? raw === 'true' : Number(raw);
      state.fields[key] = { value, status: key === 'incomeType' && value === 'unknown' ? STATUS.CHECK : STATUS.CONFIRMED, evidence: key === 'incomeType' && value === 'unknown' ? '모른다고 답함' : '직접 수정' };
      if (key === 'startMonth') syncYearEnd();
      if (!state.reviewed.includes(key)) state.reviewed.push(key);
      state.sheet = null;
      keep();
      return;
    }
    case 'saveEdit': {
      const key = el.dataset.key; const input = document.getElementById('e-val');
      const v = input && input.value !== '' ? Number(input.value) : null;
      // 잘못된 값이면 창을 닫지 않고 무엇을 넣어야 하는지 알려 준다.
      // 범위를 벗어나거나 소수인 시급은 말없이 바꾸지 않는다(예전에는 0.5시간을 그대로, 53시간은 52로, 10.5원은 11원으로 바꿨다).
      const bad = !v || v <= 0 ? (key === 'weeklyHours' ? '일주일에 1시간 이상으로 넣어 주세요' : '시급을 넣어 주세요')
        : key === 'weeklyHours' && v < 1 ? '일주일에 1시간 이상으로 넣어 주세요'
          : key === 'weeklyHours' && v > 52 ? '일주일에 52시간까지 넣을 수 있어요'
            : key === 'hourlyWage' && v >= 1_000_000 ? '시급은 100만 원보다 적게 넣어 주세요'
              : key === 'hourlyWage' && !Number.isInteger(v) ? '시급은 1원 단위로 넣어 주세요' : null;
      if (bad) { state.sheet.hint = bad; state.sheet.draft = input ? input.value : ''; renderSheet(); document.getElementById('e-val')?.focus(); return; }
      state.fields[key] = { value: key === 'weeklyHours' ? Math.min(52, v) : Math.round(v), status: STATUS.CONFIRMED, evidence: '직접 수정' };
      if (!state.reviewed.includes(key)) state.reviewed.push(key);
      state.sheet = null;
      keep();
      return;
    }
    case 'saveDays': {
      const input = document.getElementById('e-days');
      const v = input && input.value !== '' ? Math.round(Number(input.value)) : null;
      if (!v || v < 1 || v > MAX_SHORT_DAYS) { state.sheet.hint = `1~${MAX_SHORT_DAYS}일 사이로 넣어 주세요`; state.sheet.draft = input ? input.value : ''; renderSheet(); document.getElementById('e-days')?.focus(); return; }
      state.fields.months = { value: v, unit: 'day', status: STATUS.CONFIRMED, evidence: '직접 수정' };
      if (!state.reviewed.includes('months')) state.reviewed.push('months');
      state.sheet = null;
      keep();
      return;
    }
    case 'saveDates': {
      const s = document.getElementById('e-sdate');
      const e2 = document.getElementById('e-edate');
      if (!s.value || !s.checkValidity()) { s.reportValidity(); s.focus(); return; }
      if (!e2.value || e2.value < s.value || !e2.checkValidity()) {
        if (e2.value && e2.value < s.value) e2.setCustomValidity('끝나는 날이 시작일보다 앞서요');
        e2.reportValidity(); e2.focus(); return;
      }
      state.fields.months = { value: daysBetween(s.value, e2.value), unit: 'date', start: s.value, end: e2.value, status: STATUS.CONFIRMED, evidence: '직접 수정' };
      state.fields.startMonth = { value: Number(s.value.slice(5, 7)), status: STATUS.CONFIRMED, evidence: '시작일에서 정함' };
      for (const k of ['months', 'startMonth']) if (!state.reviewed.includes(k)) state.reviewed.push(k);
      state.sheet = null;
      keep();
      return;
    }
    case 'sheetUnit': state.sheet.unit = el.dataset.value; state.sheet.hint = null; state.sheet.draft = undefined; renderSheet(); return;
    case 'closeSheet': state.sheet = null; renderSheet(); return;
    case 'saveDraft': {
      const wasEditing = state.editing !== null;
      saveDraft();
      state.step = wasEditing || state.offers.length > 1 ? 'offers' : 'profile';
      state.profileQ = 0;
      break;
    }
    case 'saveAndAdd': saveDraft(); Object.assign(state, { fields: emptyFields(), step: 'upload', manual: null }); break;
    case 'addOffer': Object.assign(state, { editing: null, fields: emptyFields(), rawText: '', sample: null, extractedBy: null, aiError: null, step: 'upload', manual: null }); break;
    case 'newOffer': {
      const profile = clone(state.profile);
      resetAll();
      Object.assign(state, { profile, fields: emptyFields(), step: 'upload' });
      break;
    }
    case 'editOffer': {
      const o = state.offers[Number(el.dataset.i)];
      Object.assign(state, { editing: Number(el.dataset.i), fields: clone(o.fields), rawText: o.rawText, extractedBy: o.extractedBy, step: 'confirm' });
      state.reviewed = relevantKeys(state.fields); state.reviewTotal = 0;
      break;
    }
    case 'removeOffer': state.offers.splice(Number(el.dataset.i), 1); keep(); return;
    case 'detail': openOffer(Number(el.dataset.i)); state.step = 'result'; break;
    case 'nextQ': {
      // 직접 친 숫자가 범위를 벗어나면 넘어가지 않고 알려 준다 (−/+ 버튼만 범위를 지키므로).
      const cur = profileQuestions()[state.profileQ].q;
      const typed = (id) => { const x = document.getElementById(id); return x && x.value !== '' ? Number(x.value) : null; };
      const bad = cur === 'maxHours' && typed('p-max') !== null && !(typed('p-max') >= 1 && typed('p-max') <= 52) ? ['p-max', '일주일에 1~52시간 사이로 넣어 주세요']
        // 붙여 넣은 소수(10.5)는 예전에는 말없이 11로 반올림했다.
        : cur === 'maxHours' && typed('p-max') !== null && !Number.isInteger(typed('p-max')) ? ['p-max', '최대 시간은 1시간 단위로 넣어 주세요']
        : cur === 'age' && typed('p-age') !== null && !(typed('p-age') >= 15 && typed('p-age') <= 99) ? ['p-age', '만 나이는 15~99세 사이로 넣어 주세요'] : null;
      // 칸을 떠날 때(change) 최대 시간을 1~52로 잘라 저장했어도, 안내와 함께 보이는 값은 친 그대로 둔다.
      // 53을 쳤는데 칸에는 52가 보이면서 '1~52시간 사이로'라고 하면 무엇이 틀렸는지 알 수 없어서다.
      if (bad) { state.profile[bad[0] === 'p-max' ? 'maxHours' : 'age'] = typed(bad[0]); state.profileError = bad[1]; keep(); document.getElementById(bad[0])?.focus(); return; }
      // '올해 이미 번 돈' 세 칸에 음수가 있으면 넘어가지 않는다. 키보드 '-'는 막지만 붙여넣기로는 들어와, 그대로 두면 번 돈을 줄여 계산한다.
      const neg = cur === 'ytd' ? ['y-wage', 'y-business', 'y-daily'].find((id) => typed(id) < 0) : null;
      if (neg) { saveProfileInputs(); state.ytdOpen = true; state.profileError = '금액은 0보다 큰 수로 적어 주세요. \'-\'는 넣을 수 없어요'; keep(); document.getElementById(neg)?.focus(); return; }
      saveProfileInputs();
      if (profileQuestions()[state.profileQ].q === 'maxHours' && !state.profile.maxHours) {
        state.profileError = '일할 수 있는 최대 시간을 넣어 주세요. 비교는 이 시간 안에서만 해요';
        keep(); document.getElementById('p-max')?.focus(); return;
      }
      // 나이를 비우면 넘어가지 않는다. 비운 채 넘기면 부모님 세금 공제를 묻는지 나이 없이 정하게 된다.
      if (profileQuestions()[state.profileQ].q === 'age' && state.profile.age == null) {
        state.profileError = '만 나이를 넣어 주세요. 부모님 세금 공제를 받을 수 있는지 정할 때 써요';
        keep(); document.getElementById('p-age')?.focus(); return;
      }
      // '올해 이미 번 돈'에서 '있어요'를 골랐는데(세 칸이 보이는 상태) 세 칸이 모두 비어 있으면 넘어가지 않는다.
      // 그대로 넘기면 '없어요'와 같은 계산이 된다. 0은 빈칸과 같다(다시 그리면 빈칸으로 보인다).
      if (cur === 'ytd' && document.getElementById('y-wage') && !Object.values(state.profile.ytdIncome).some((v) => v > 0)) {
        state.ytdOpen = true;
        state.profileError = '금액을 한 칸 이상 적어야 다음으로 갈 수 있어요. 번 돈이 없으면 \'없어요\'를 눌러요';
        keep();
        // 첫 칸에 커서를 둔다. 작은 화면에서 아래로 내린 채 누르면 안내가 위쪽 막대 뒤에 가려지므로, 그때만 안내가 보이게 옮긴다.
        const msg = document.getElementById('y-err'); const first = document.getElementById('y-wage');
        first.focus({ preventScroll: true });
        const barTop = barEl.hidden ? window.innerHeight : barEl.getBoundingClientRect().top;
        if (msg.getBoundingClientRect().top < topEl.getBoundingClientRect().bottom || first.getBoundingClientRect().bottom > barTop) {
          msg.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
        }
        return;
      }
      state.profileError = null;
      state.profileQ = Math.min(state.profileQ + 1, profileQuestions().length - 1);
      break;
    }
    case 'step': case 'setNum': {
      const input = document.getElementById(el.dataset.target);
      if (!input) return;
      const min = Number(input.min || 0); const max = Number(input.max || 999);
      const next = a === 'setNum' ? Number(el.dataset.value) : (Number(input.value) || (Number(el.dataset.delta) > 0 ? min - 1 : min)) + Number(el.dataset.delta);
      input.value = Math.min(max, Math.max(min, next));
      fitNum(input);
      if (state.step === 'profile') { saveProfileInputs(); state.profileError = null; persist(); }
      return;
    }
    case 'choose': {
      saveProfileInputs();
      const name = el.dataset.name; const value = el.dataset.value;
      if (el.dataset.multi) {
        const list = new Set(state.profile[name] || []);
        list.has(value) ? list.delete(value) : list.add(value);
        state.profile[name] = [...list];
      } else state.profile[name] = /EndMonth$/.test(name) && value !== 'unknown' ? Number(value) : value;
      if (END_DATE[name]) state.profile[END_DATE[name]] = null;
      keep();
      return;
    }
    // 끝나는 날 달력: 고른 날짜와 그 달(계산에 쓰는 값)을 함께 넣는다. 다시 그린 뒤에도 누른 버튼에 초점을 둔다.
    case 'endDay': {
      const name = el.dataset.name; const v = el.dataset.value;
      state.profile[name] = Number(v.slice(5, 7));
      state.profile[END_DATE[name]] = v;
      keep();
      app.querySelector(`[data-action=endDay][data-name=${name}][data-value="${v}"]`)?.focus({ preventScroll: true });
      return;
    }
    case 'endMove': {
      const name = el.dataset.name; const dir = Number(el.dataset.value);
      const basis = `${state.profile[name]}|${endDateOf(name) || ''}`;
      state.endCal = { ...(state.endCal || {}), [name]: { mo: Math.min(12, Math.max(1, endCalMonth(name) + dir)), basis } };
      keep();
      const navs = [...app.querySelectorAll(`[data-action=endMove][data-name=${name}]`)];
      (navs.find((b) => b.dataset.value === String(dir) && !b.disabled) || navs.find((b) => !b.disabled))?.focus({ preventScroll: true });
      return;
    }
    case 'noSupports': state.profile.otherSupports = []; keep(); return;
    case 'ytd':
      state.ytdOpen = el.dataset.value === 'yes';
      if (!state.ytdOpen) state.profile.ytdIncome = { wage: 0, business: 0, daily: 0 };
      state.profileError = null;
      keep();
      return;
    case 'calculate': {
      saveProfileInputs();
      if (!state.profile.maxHours) { state.profileQ = 0; state.profileError = '일할 수 있는 최대 시간을 넣어 주세요. 비교는 이 시간 안에서만 해요'; break; }
      recalculate();
      openOffer(0);
      state.step = state.offers.length > 1 ? 'compare' : 'result';
      break;
    }
    case 'cardSheet': state.sheet = { type: 'card', id: el.dataset.id }; renderSheet(); return;
    case 'amountSheet': state.sheet = { type: 'amounts' }; renderSheet(); return;
    case 'altsAt': state.chosenHours = Number(el.dataset.hours); state.requestAction = null; state.step = 'alts'; break;
    case 'chooseHours': state.chosenHours = Number(el.dataset.hours); state.requestAction = null; keep(); return;
    case 'reqAction': state.requestAction = el.dataset.value; keep(); return;
    case 'copy': {
      const text = document.getElementById('msg').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
        () => { el.textContent = '복사했어요'; },
        () => { el.textContent = '문구를 길게 눌러 복사해 주세요'; },
      );
      return;
    }
    case 'restart':
      if (!hasWork()) { resetAll(); break; }
      state.sheet = { type: 'home', clear: true }; renderSheet(); return;
    case 'home': state.step = 'start'; state.sheet = null; break;
    case 'homeAsk':
      saveProfileInputs();
      if (!hasWork()) { resetAll(); break; }
      state.sheet = { type: 'home' }; renderSheet(); return;
    case 'goHome': resetAll(); break;
    case 'motion': toggleMotion(); return;
    case 'consent': {
      const yes = el.dataset.value === 'yes';
      saveConsent(yes ? 'yes' : 'no');
      state.sheet = null;
      if (yes) startClarity();
      break;
    }
    case 'consentAsk': state.sheet = { type: 'consent' }; renderSheet(); return;
    case 'consentWithdraw': withdrawConsent(); return;
    case 'consentPrivacy': state.sheet = null; state.returnStep = state.step; state.step = 'privacy'; break;
    default: return;
  }
  render();
});

fetch('data/rules.json').then((r) => r.json()).then((rules) => {
  state.rules = rules;
  window.__munteok = state; // 점검용
  restore();
  // 공개 체험 주소에서만: 동의했으면 사용 기록을 켜고, 아직 고르지 않았으면 묻는다.
  if (CLARITY_ID) {
    const choice = consentChoice();
    if (choice === 'yes') startClarity();
    else if (choice !== 'no') state.sheet = { type: 'consent' };
  }
  render();
}).catch(() => {
  app.innerHTML = '<p class="gline warn" role="alert">계산 규칙을 불러오지 못했어요. 새로고침해 주세요</p>';
});
